"use server";

import { cookies, headers } from "next/headers";
import { after } from "next/server";
import prisma from "@/lib/server/prisma";
import ResponseBuilder from "@/lib/server/response";
import type { ApiResponse } from "@repo/shared-types/api/common";
import { getClientIP, getClientUserAgent } from "@/lib/server/get-client-info";
import limitControl from "@/lib/server/rate-limit";
import { checkReauthToken } from "./reauth";
import { getConfig } from "@/lib/server/config-cache";
import redis, { ensureRedisConnection } from "@/lib/server/redis";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import { jwtTokenSign } from "@/lib/server/jwt";
import { UAParser } from "ua-parser-js";

// Redis keys
const REG_CHALLENGE_KEY = (uid: number) => `passkey:challenge:reg:${uid}`;
const AUTH_CHALLENGE_KEY = (nonce: string) => `passkey:challenge:auth:${nonce}`; // 未登录用户使用随机nonce

// TTL seconds
const CHALLENGE_TTL = 600; // 10分钟

// 公共工具：获取 RP 配置
async function getRPConfig() {
  const siteUrl = await getConfig<string>("site.url");
  const rpName = await getConfig<string>(
    "site.title",
    "NeutralPress",
    "default",
  );
  const url = new URL(siteUrl || "http://localhost:3000");
  const rpID = url.hostname; // 域名作为 rpID
  const origin = url.origin;
  return { rpID, rpName, origin };
}

// 公共工具：检查是否启用 & 限制个数
async function assertPasskeyEnabledAndLimit(uid?: number) {
  const enabled = await getConfig<boolean>(
    "user.passkey.enabled",
    true,
    "default",
  );
  if (!enabled) throw new Error("PASSKEY_DISABLED");
  if (uid) {
    const maxPerUser = await getConfig<number>(
      "user.passkey.maxPerUser",
      5,
      "default",
    );
    const count = await prisma.passkey.count({ where: { userUid: uid } });
    if (count >= maxPerUser) throw new Error("PASSKEY_LIMIT_EXCEEDED");
  }
}

// 获取当前已登录用户 UID（用于注册/管理）
async function getCurrentUid(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
  const { jwtTokenVerify } = await import("@/lib/server/jwt");
  const decoded = jwtTokenVerify<{ uid: number }>(token);
  return decoded?.uid ?? null;
}

// ===== 注册（需要登录 + reauth） =====
export async function generatePasskeyRegistrationOptions(): Promise<
  ApiResponse<{ options: PublicKeyCredentialCreationOptionsJSON }>
> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "passkeyRegOptions")))
    return response.tooManyRequests() as unknown as ApiResponse<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>;

  try {
    const uid = await getCurrentUid();
    if (!uid) {
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<{
        options: PublicKeyCredentialCreationOptionsJSON;
      }>;
    }

    const hasReauth = await checkReauthToken();
    if (!hasReauth) {
      return response.unauthorized({
        message: "需要重新验证身份",
        error: { code: "NEED_REAUTH", message: "需要重新验证身份" },
      }) as unknown as ApiResponse<{
        options: PublicKeyCredentialCreationOptionsJSON;
      }>;
    }

    await assertPasskeyEnabledAndLimit(uid);

    const user = await prisma.user.findUnique({
      where: { uid },
      select: { uid: true, username: true, email: true },
    });
    if (!user)
      return response.badRequest({
        message: "用户不存在",
      }) as unknown as ApiResponse<{
        options: PublicKeyCredentialCreationOptionsJSON;
      }>;

    const { rpID, rpName } = await getRPConfig();

    const options = await generateRegistrationOptions({
      rpID,
      rpName,
      userID: new TextEncoder().encode(String(user.uid)),
      userName: user.username,
      userDisplayName: user.email || user.username,
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        requireResidentKey: false,
        authenticatorAttachment: "platform",
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    // 存储挑战
    await ensureRedisConnection();
    await redis.set(
      REG_CHALLENGE_KEY(uid),
      options.challenge,
      "EX",
      CHALLENGE_TTL,
    );

    return response.ok({
      message: "生成成功",
      data: { options },
    }) as unknown as ApiResponse<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>;
  } catch (error) {
    console.error("generatePasskeyRegistrationOptions error:", error);
    const code =
      (error as Error)?.message === "PASSKEY_DISABLED"
        ? "PASSKEY_DISABLED"
        : (error as Error)?.message;
    return response.serverError({
      message: "生成失败",
      error: { code: code || "SERVER_ERROR", message: "生成失败" },
    }) as unknown as ApiResponse<{
      options: PublicKeyCredentialCreationOptionsJSON;
    }>;
  }
}

export async function verifyPasskeyRegistration(payload: {
  response: unknown;
  name?: string;
}): Promise<ApiResponse<null>> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "passkeyRegVerify")))
    return response.tooManyRequests() as unknown as ApiResponse<null>;

  try {
    const uid = await getCurrentUid();
    if (!uid)
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<null>;

    const hasReauth = await checkReauthToken();
    if (!hasReauth) {
      return response.unauthorized({
        message: "需要重新验证身份",
        error: { code: "NEED_REAUTH", message: "需要重新验证身份" },
      }) as unknown as ApiResponse<null>;
    }

    await assertPasskeyEnabledAndLimit(uid);

    await ensureRedisConnection();
    const expectedChallenge = await redis.get(REG_CHALLENGE_KEY(uid));
    if (!expectedChallenge) {
      return response.badRequest({
        message: "挑战已过期，请重试",
      }) as unknown as ApiResponse<null>;
    }

    const { rpID, origin } = await getRPConfig();

    const verification: VerifiedRegistrationResponse =
      await verifyRegistrationResponse({
        response:
          payload.response as unknown as import("@simplewebauthn/server").RegistrationResponseJSON,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });

    if (!verification.verified || !verification.registrationInfo) {
      return response.badRequest({
        message: "注册验证失败",
      }) as unknown as ApiResponse<null>;
    }

    const { credential, credentialDeviceType } = verification.registrationInfo;
    const credentialId =
      typeof credential.id === "string"
        ? credential.id
        : Buffer.from(credential.id).toString("base64url");
    const publicKey = Buffer.from(credential.publicKey).toString("base64");
    const counter = credential.counter ?? 0;

    // 获取客户端信息
    const clientUserAgent = await getClientUserAgent();

    // 解析 User-Agent 获取操作系统和浏览器信息
    let deviceInfo: string | undefined;
    if (clientUserAgent) {
      const parser = new UAParser(clientUserAgent);
      const uaResult = parser.getResult();

      const os = uaResult.os.name || null;
      const browser = uaResult.browser.name || null;

      // 组合显示格式: "Windows 11 Edge" 或 "macOS Safari"
      const parts: string[] = [];
      if (os) {
        // 简化 OS 名称显示
        if (os === "Windows") {
          const osVersion = uaResult.os.version;
          if (osVersion?.startsWith("10") || osVersion?.startsWith("11")) {
            parts.push(`Windows ${osVersion.split(".")[0]}`);
          } else {
            parts.push("Windows");
          }
        } else if (os === "Mac OS") {
          parts.push("macOS");
        } else if (os === "iOS") {
          parts.push("iOS");
        } else if (os === "Android") {
          parts.push("Android");
        } else {
          parts.push(os);
        }
      }

      if (browser) {
        // 只保留浏览器名称，不显示版本号
        parts.push(browser);
      }

      deviceInfo = parts.length > 0 ? parts.join(" ") : undefined;
    }

    // 存储 Passkey
    await prisma.passkey.create({
      data: {
        userUid: uid,
        credentialId: credentialId,
        publicKey: publicKey,
        counter: BigInt(counter || 0),
        transports: [],
        name: payload.name || "未命名密钥",
        deviceType: credentialDeviceType || undefined,
        browser: deviceInfo,
      },
    });

    // 审计日志
    after(async () => {
      try {
        await prisma.user.update({
          where: { uid },
          data: { updatedAt: new Date() },
        });
        // 省略审计细节以避免类型错误；已有审计系统可按需接入
      } catch (e) {
        console.error("Audit log error:", e);
      }
    });

    // 清除挑战
    await redis.del(REG_CHALLENGE_KEY(uid));

    return response.ok({
      message: "通行密钥已绑定",
      data: null,
    }) as unknown as ApiResponse<null>;
  } catch (error) {
    console.error("verifyPasskeyRegistration error:", error);
    return response.serverError({
      message: "注册失败",
      error: { code: "SERVER_ERROR", message: "注册失败" },
    }) as unknown as ApiResponse<null>;
  }
}

// ===== 登录（无需验证码） =====
export async function generatePasskeyAuthenticationOptions(): Promise<
  ApiResponse<{ nonce: string; options: PublicKeyCredentialRequestOptionsJSON }>
> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "passkeyAuthOptions")))
    return response.tooManyRequests() as unknown as ApiResponse<{
      nonce: string;
      options: PublicKeyCredentialRequestOptionsJSON;
    }>;

  try {
    await assertPasskeyEnabledAndLimit();
    const { rpID } = await getRPConfig();

    // 发现型凭证，允许不指定 allowCredentials
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      allowCredentials: [],
    });

    const nonce = crypto.randomUUID();
    await ensureRedisConnection();
    await redis.set(
      AUTH_CHALLENGE_KEY(nonce),
      options.challenge,
      "EX",
      CHALLENGE_TTL,
    );

    return response.ok({
      message: "生成成功",
      data: { nonce, options },
    }) as unknown as ApiResponse<{
      nonce: string;
      options: PublicKeyCredentialRequestOptionsJSON;
    }>;
  } catch (error) {
    console.error("generatePasskeyAuthenticationOptions error:", error);
    const code =
      (error as Error)?.message === "PASSKEY_DISABLED"
        ? "PASSKEY_DISABLED"
        : (error as Error)?.message;
    return response.serverError({
      message: "生成失败",
      error: { code: code || "SERVER_ERROR", message: "生成失败" },
    }) as unknown as ApiResponse<{
      nonce: string;
      options: PublicKeyCredentialRequestOptionsJSON;
    }>;
  }
}

export async function verifyPasskeyAuthentication(payload: {
  nonce: string;
  response: unknown;
}): Promise<
  ApiResponse<{
    userInfo: {
      uid: number;
      username: string;
      nickname: string | null;
      email: string;
      avatar: string | null;
      role: string;
      exp: string;
    };
  }>
> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "passkeyAuthVerify")))
    return response.tooManyRequests() as unknown as ApiResponse<{
      userInfo: {
        uid: number;
        username: string;
        nickname: string | null;
        email: string;
        avatar: string | null;
        role: string;
        exp: string;
      };
    }>;

  try {
    await ensureRedisConnection();
    const expectedChallenge = await redis.get(
      AUTH_CHALLENGE_KEY(payload.nonce),
    );
    if (!expectedChallenge) {
      return response.badRequest({
        message: "挑战已过期，请重试",
      }) as unknown as ApiResponse<{
        userInfo: {
          uid: number;
          username: string;
          nickname: string | null;
          email: string;
          avatar: string | null;
          role: string;
          exp: string;
        };
      }>;
    }

    const { rpID, origin } = await getRPConfig();

    const authResponse =
      payload.response as unknown as import("@simplewebauthn/server").AuthenticationResponseJSON;
    const incomingCredentialId = authResponse.id; // base64url

    // 先根据响应中的 credential id 查找数据库中的 passkey
    const passkey = await prisma.passkey.findUnique({
      where: { credentialId: incomingCredentialId },
    });
    if (!passkey) {
      return response.badRequest({
        message: "未找到对应通行密钥",
      }) as unknown as ApiResponse<{
        userInfo: {
          uid: number;
          username: string;
          nickname: string | null;
          email: string;
          avatar: string | null;
          role: string;
          exp: string;
        };
      }>;
    }

    const verification: VerifiedAuthenticationResponse =
      await verifyAuthenticationResponse({
        response: authResponse,
        expectedChallenge,
        expectedRPID: rpID,
        expectedOrigin: origin,
        requireUserVerification: true,
        credential: {
          id: passkey.credentialId,
          publicKey: Buffer.from(passkey.publicKey, "base64"),
          counter: Number(passkey.counter),
        },
      });

    if (!verification.verified || !verification.authenticationInfo) {
      return response.badRequest({
        message: "登录验证失败",
      }) as unknown as ApiResponse<{
        userInfo: {
          uid: number;
          username: string;
          nickname: string | null;
          email: string;
          avatar: string | null;
          role: string;
          exp: string;
        };
      }>;
    }

    const { credentialID, newCounter } = verification.authenticationInfo;
    const credentialIdB64 = credentialID;

    // 更新计数器与最后使用时间
    await prisma.passkey.update({
      where: { credentialId: credentialIdB64 },
      data: {
        counter: BigInt(newCounter || Number(passkey.counter)),
        lastUsedAt: new Date(),
      },
    });

    const user = await prisma.user.findUnique({
      where: { uid: passkey.userUid },
      select: {
        uid: true,
        username: true,
        nickname: true,
        email: true,
        avatar: true,
        role: true,
      },
    });

    if (!user)
      return response.badRequest({
        message: "用户不存在",
      }) as unknown as ApiResponse<{
        userInfo: {
          uid: number;
          username: string;
          nickname: string | null;
          email: string;
          avatar: string | null;
          role: string;
          exp: string;
        };
      }>;

    // 发放 token（跳过验证码）
    const expiredAtSeconds = 30 * 24 * 60 * 60; // 30天
    const expiredAt = new Date(Date.now() + expiredAtSeconds * 1000);
    const expiredAtUnix = Math.floor(expiredAt.getTime() / 1000);

    const clientIP = await getClientIP();
    const clientUserAgent = await getClientUserAgent();

    const dbRefreshToken = await prisma.refreshToken.create({
      data: {
        userUid: user.uid,
        expiresAt: expiredAt,
        ipAddress: clientIP,
        userAgent: clientUserAgent,
        lastUsedAt: new Date(),
      },
    });

    const refreshToken = jwtTokenSign({
      inner: { uid: user.uid, tokenId: dbRefreshToken.id, exp: expiredAtUnix },
      expired: "30d",
    });
    const accessToken = jwtTokenSign({
      inner: {
        uid: user.uid,
        username: user.username,
        nickname: user.nickname ?? "",
        role: user.role,
      },
      expired: "10m",
    });

    const cookieStore = await cookies();
    cookieStore.set("REFRESH_TOKEN", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: expiredAtSeconds,
      path: "/",
      priority: "high",
    });
    cookieStore.set("ACCESS_TOKEN", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 600,
      path: "/",
      priority: "high",
    });

    after(async () => {
      try {
        await prisma.user.update({
          where: { uid: user.uid },
          data: { lastUseAt: new Date() },
        });
      } catch (e) {
        console.error("Post-login update failed:", e);
      }
    });

    await redis.del(AUTH_CHALLENGE_KEY(payload.nonce));

    return response.ok({
      message: "登录成功",
      data: {
        userInfo: {
          uid: user.uid,
          username: user.username,
          nickname: user.nickname ?? null,
          email: user.email,
          avatar: user.avatar ?? null,
          role: user.role,
          exp: String(expiredAtUnix),
        },
      },
    }) as unknown as ApiResponse<{
      userInfo: {
        uid: number;
        username: string;
        nickname: string | null;
        email: string;
        avatar: string | null;
        role: string;
        exp: string;
      };
    }>;
  } catch (error) {
    console.error("verifyPasskeyAuthentication error:", error);
    return response.serverError({
      message: "登录失败",
      error: { code: "SERVER_ERROR", message: "登录失败" },
    }) as unknown as ApiResponse<{
      userInfo: {
        uid: number;
        username: string;
        nickname: string | null;
        email: string;
        avatar: string | null;
        role: string;
        exp: string;
      };
    }>;
  }
}

// ===== 管理（需要登录 + reauth） =====
export async function listUserPasskeys(): Promise<
  ApiResponse<{
    items: Array<{
      credentialId: string;
      name: string;
      deviceType: string | null;
      browser: string | null;
      createdAt: string;
      lastUsedAt: string | null;
    }>;
  }>
> {
  const response = new ResponseBuilder("serveraction");
  try {
    const uid = await getCurrentUid();
    if (!uid)
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<{
        items: Array<{
          credentialId: string;
          name: string;
          deviceType: string | null;
          browser: string | null;
          createdAt: string;
          lastUsedAt: string | null;
        }>;
      }>;
    await assertPasskeyEnabledAndLimit();
    const items = await prisma.passkey.findMany({
      where: { userUid: uid },
      orderBy: { createdAt: "desc" },
      select: {
        credentialId: true,
        name: true,
        deviceType: true,
        browser: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    return response.ok({
      message: "获取成功",
      data: {
        items: items.map((i) => ({
          credentialId: i.credentialId,
          name: i.name,
          deviceType: i.deviceType ?? null,
          browser: i.browser ?? null,
          createdAt: i.createdAt.toISOString(),
          lastUsedAt: i.lastUsedAt ? i.lastUsedAt.toISOString() : null,
        })),
      },
    }) as unknown as ApiResponse<{
      items: Array<{
        credentialId: string;
        name: string;
        deviceType: string | null;
        browser: string | null;
        createdAt: string;
        lastUsedAt: string | null;
      }>;
    }>;
  } catch (error) {
    console.error("listUserPasskeys error:", error);
    return response.serverError({
      message: "获取失败",
      error: { code: "SERVER_ERROR", message: "获取失败" },
    }) as unknown as ApiResponse<{
      items: Array<{
        credentialId: string;
        name: string;
        deviceType: string | null;
        browser: string | null;
        createdAt: string;
        lastUsedAt: string | null;
      }>;
    }>;
  }
}

export async function renamePasskey({
  credentialId,
  name,
}: {
  credentialId: string;
  name: string;
}): Promise<ApiResponse<null>> {
  const response = new ResponseBuilder("serveraction");
  try {
    const uid = await getCurrentUid();
    if (!uid)
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<null>;

    const hasReauth = await checkReauthToken();
    if (!hasReauth) {
      return response.unauthorized({
        message: "需要重新验证身份",
        error: { code: "NEED_REAUTH", message: "需要重新验证身份" },
      }) as unknown as ApiResponse<null>;
    }

    const pk = await prisma.passkey.findUnique({ where: { credentialId } });
    if (!pk || pk.userUid !== uid)
      return response.badRequest({
        message: "未找到通行密钥",
      }) as unknown as ApiResponse<null>;

    await prisma.passkey.update({ where: { credentialId }, data: { name } });
    return response.ok({
      message: "重命名成功",
      data: null,
    }) as unknown as ApiResponse<null>;
  } catch (error) {
    console.error("renamePasskey error:", error);
    return response.serverError({
      message: "操作失败",
      error: { code: "SERVER_ERROR", message: "操作失败" },
    }) as unknown as ApiResponse<null>;
  }
}

export async function deletePasskey({
  credentialId,
}: {
  credentialId: string;
}): Promise<ApiResponse<null>> {
  const response = new ResponseBuilder("serveraction");
  try {
    const uid = await getCurrentUid();
    if (!uid)
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<null>;

    const hasReauth = await checkReauthToken();
    if (!hasReauth) {
      return response.unauthorized({
        message: "需要重新验证身份",
        error: { code: "NEED_REAUTH", message: "需要重新验证身份" },
      }) as unknown as ApiResponse<null>;
    }

    const pk = await prisma.passkey.findUnique({ where: { credentialId } });
    if (!pk || pk.userUid !== uid)
      return response.badRequest({
        message: "未找到通行密钥",
      }) as unknown as ApiResponse<null>;

    await prisma.passkey.delete({ where: { credentialId } });
    return response.ok({
      message: "删除成功",
      data: null,
    }) as unknown as ApiResponse<null>;
  } catch (error) {
    console.error("deletePasskey error:", error);
    return response.serverError({
      message: "操作失败",
      error: { code: "SERVER_ERROR", message: "操作失败" },
    }) as unknown as ApiResponse<null>;
  }
}
