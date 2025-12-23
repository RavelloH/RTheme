"use server";

import { cookies, headers } from "next/headers";
import prisma from "@/lib/server/prisma";
import {
  jwtTokenVerify,
  jwtTokenSign,
  type AccessTokenPayload,
} from "@/lib/server/jwt";
import { verifyPassword } from "@/lib/server/password";
import ResponseBuilder from "@/lib/server/response";
import type { ApiResponse } from "@repo/shared-types/api/common";
import limitControl from "@/lib/server/rateLimit";
import { verifyToken } from "./captcha";

const REAUTH_TOKEN_EXPIRY = 600; // 10 分钟

/**
 * 检查是否有有效的 REAUTH_TOKEN
 */
export async function checkReauthToken(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const reauthToken = cookieStore.get("REAUTH_TOKEN")?.value;

    if (!reauthToken) {
      return false;
    }

    // 验证 token 是否有效
    const decoded = jwtTokenVerify<{ uid: number; exp: number }>(reauthToken);
    if (!decoded) {
      return false;
    }

    // 检查是否过期
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Check reauth token error:", error);
    return false;
  }
}

/**
 * 获取当前用户信息（用于 reauth 页面）
 */
export async function getCurrentUserForReauth(): Promise<
  ApiResponse<{
    uid: number;
    username: string;
    email: string;
    hasPassword: boolean;
    linkedProviders: string[];
  }>
> {
  const response = new ResponseBuilder("serveraction");

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<{
        uid: number;
        username: string;
        email: string;
        hasPassword: boolean;
        linkedProviders: string[];
      }>;
    }

    const { uid } = decoded;

    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        username: true,
        email: true,
        password: true,
        accounts: {
          select: {
            provider: true,
          },
        },
      },
    });

    if (!user) {
      return response.unauthorized({
        message: "用户不存在",
      }) as unknown as ApiResponse<{
        uid: number;
        username: string;
        email: string;
        hasPassword: boolean;
        linkedProviders: string[];
      }>;
    }

    return response.ok({
      message: "获取成功",
      data: {
        uid: user.uid,
        username: user.username,
        email: user.email,
        hasPassword: !!user.password,
        linkedProviders: user.accounts.map((acc) => acc.provider.toLowerCase()),
      },
    }) as unknown as ApiResponse<{
      uid: number;
      username: string;
      email: string;
      hasPassword: boolean;
      linkedProviders: string[];
    }>;
  } catch (error) {
    console.error("Get current user for reauth error:", error);
    return response.serverError({
      message: "获取用户信息失败",
      error: {
        code: "SERVER_ERROR",
        message: "获取用户信息失败",
      },
    }) as unknown as ApiResponse<{
      uid: number;
      username: string;
      email: string;
      hasPassword: boolean;
      linkedProviders: string[];
    }>;
  }
}

/**
 * 通过密码验证身份并设置 REAUTH_TOKEN
 */
export async function verifyPasswordForReauth({
  password,
  captcha_token,
}: {
  password: string;
  captcha_token: string;
}): Promise<ApiResponse<null>> {
  const response = new ResponseBuilder("serveraction");

  // 速率控制（与登录一致）
  if (!(await limitControl(await headers(), "reauth"))) {
    return response.tooManyRequests() as unknown as ApiResponse<null>;
  }

  // 验证码验证（与登录一致）
  if (!(await verifyToken(captcha_token)).success) {
    return response.unauthorized({
      message: "安全验证失败，请刷新页面重试",
    }) as unknown as ApiResponse<null>;
  }

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<null>;
    }

    const { uid } = decoded;

    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        password: true,
      },
    });

    if (!user) {
      return response.unauthorized({
        message: "用户不存在",
      }) as unknown as ApiResponse<null>;
    }

    if (!user.password) {
      return response.badRequest({
        message: "此账户未设置密码",
        error: {
          code: "NO_PASSWORD_SET",
          message: "此账户未设置密码",
        },
      }) as unknown as ApiResponse<null>;
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(user.password, password);
    if (!isPasswordValid.isValid) {
      return response.badRequest({
        message: "密码错误",
        error: {
          code: "INVALID_PASSWORD",
          message: "密码错误",
        },
      }) as unknown as ApiResponse<null>;
    }

    // 生成 REAUTH_TOKEN
    const expiredAtUnix = Math.floor(Date.now() / 1000) + REAUTH_TOKEN_EXPIRY;
    const reauthToken = jwtTokenSign({
      inner: {
        uid: user.uid,
        exp: expiredAtUnix,
      },
      expired: `${REAUTH_TOKEN_EXPIRY}s`,
    });

    // 设置 REAUTH_TOKEN cookie
    cookieStore.set("REAUTH_TOKEN", reauthToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REAUTH_TOKEN_EXPIRY,
      path: "/",
      priority: "high",
    });

    return response.ok({
      message: "验证成功",
      data: null,
    }) as unknown as ApiResponse<null>;
  } catch (error) {
    console.error("Verify password for reauth error:", error);
    return response.serverError({
      message: "验证失败，请稍后重试",
      error: {
        code: "SERVER_ERROR",
        message: "验证失败，请稍后重试",
      },
    }) as unknown as ApiResponse<null>;
  }
}

/**
 * 通过 SSO 验证身份并设置 REAUTH_TOKEN
 * 在 SSO 回调时调用此函数
 */
export async function verifySSOForReauth({
  uid,
  provider,
  providerAccountId,
}: {
  uid: number;
  provider: string;
  providerAccountId: string;
}): Promise<ApiResponse<null>> {
  const response = new ResponseBuilder("serveraction");

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<null>;
    }

    // 验证 uid 是否匹配当前登录用户
    if (decoded.uid !== uid) {
      return response.forbidden({
        message: "身份验证失败",
        error: {
          code: "UID_MISMATCH",
          message: "身份验证失败",
        },
      }) as unknown as ApiResponse<null>;
    }

    const user = await prisma.user.findUnique({
      where: { uid },
      select: {
        uid: true,
        accounts: {
          where: {
            provider: provider.toUpperCase() as
              | "GOOGLE"
              | "GITHUB"
              | "MICROSOFT",
          },
        },
      },
    });

    if (!user) {
      return response.unauthorized({
        message: "用户不存在",
      }) as unknown as ApiResponse<null>;
    }

    // 验证账户绑定关系（安全关键）
    const account = user.accounts.find(
      (acc) => acc.providerAccountId === providerAccountId,
    );

    if (!account) {
      return response.forbidden({
        message: "此 SSO 账户未绑定到当前用户",
        error: {
          code: "ACCOUNT_NOT_LINKED",
          message: "此 SSO 账户未绑定到当前用户",
        },
      }) as unknown as ApiResponse<null>;
    }

    // 生成 REAUTH_TOKEN
    const expiredAtUnix = Math.floor(Date.now() / 1000) + REAUTH_TOKEN_EXPIRY;
    const reauthToken = jwtTokenSign({
      inner: {
        uid: user.uid,
        exp: expiredAtUnix,
      },
      expired: `${REAUTH_TOKEN_EXPIRY}s`,
    });

    // 设置 REAUTH_TOKEN cookie
    cookieStore.set("REAUTH_TOKEN", reauthToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REAUTH_TOKEN_EXPIRY,
      path: "/",
      priority: "high",
    });

    return response.ok({
      message: "验证成功",
      data: null,
    }) as unknown as ApiResponse<null>;
  } catch (error) {
    console.error("Verify SSO for reauth error:", error);
    return response.serverError({
      message: "验证失败，请稍后重试",
      error: {
        code: "SERVER_ERROR",
        message: "验证失败，请稍后重试",
      },
    }) as unknown as ApiResponse<null>;
  }
}

/**
 * 设置 REAUTH_TOKEN（用于通行密钥验证）
 * 这个函数在通行密钥验证成功后调用
 */
export async function setReauthToken(): Promise<ApiResponse<null>> {
  const response = new ResponseBuilder("serveraction");

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ACCESS_TOKEN")?.value || "";
    const decoded = jwtTokenVerify<AccessTokenPayload>(token);

    if (!decoded) {
      return response.unauthorized({
        message: "请先登录",
      }) as unknown as ApiResponse<null>;
    }

    const { uid } = decoded;

    // 验证用户存在
    const user = await prisma.user.findUnique({
      where: { uid },
      select: { uid: true },
    });

    if (!user) {
      return response.unauthorized({
        message: "用户不存在",
      }) as unknown as ApiResponse<null>;
    }

    // 生成 REAUTH_TOKEN
    const expiredAtUnix = Math.floor(Date.now() / 1000) + REAUTH_TOKEN_EXPIRY;
    const reauthToken = jwtTokenSign({
      inner: {
        uid: user.uid,
        exp: expiredAtUnix,
      },
      expired: `${REAUTH_TOKEN_EXPIRY}s`,
    });

    // 设置 REAUTH_TOKEN cookie
    cookieStore.set("REAUTH_TOKEN", reauthToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REAUTH_TOKEN_EXPIRY,
      path: "/",
      priority: "high",
    });

    return response.ok({
      message: "验证成功",
      data: null,
    }) as unknown as ApiResponse<null>;
  } catch (error) {
    console.error("Set reauth token error:", error);
    return response.serverError({
      message: "验证失败，请稍后重试",
      error: {
        code: "SERVER_ERROR",
        message: "验证失败，请稍后重试",
      },
    }) as unknown as ApiResponse<null>;
  }
}
