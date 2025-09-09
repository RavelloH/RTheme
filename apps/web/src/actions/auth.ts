"use server";

import { validateData } from "@/lib/server/validator";
import limitControl from "@/lib/server/rateLimit";
import {
  LoginUserSchema,
  RegisterUserSchema,
  RefreshTokenSchema,
} from "@repo/shared-types/api/auth";
import prisma from "@/lib/server/prisma";
import { verifyPassword } from "@/lib/server/password";
import { jwtTokenSign } from "@/lib/server/jwt";
import ResponseBuilder from "@/lib/server/response";
import { cookies, headers } from "next/headers";
import { hashPassword } from "@/lib/server/password";
import emailUtils from "@/lib/server/email";


export async function login(
  {
    username,
    password,
    token_transport,
    captcha_token,
  }: {
    username: string;
    password: string;
    token_transport: "cookie" | "body";
    captcha_token: string;
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  }
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction"
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  try {
    // 验证输入参数
    const validationResult = validateData(
      {
        username,
        password,
        token_transport,
        captcha_token,
      },
      LoginUserSchema
    );

    if (validationResult instanceof Response) return validationResult;

    // 检查用户名或邮箱是否已存在
    const user = await prisma.user.findFirst({
      where: {
        username,
      },
      select: {
        password: true,
        accounts: true,
        username: true,
        nickname: true,
        uid: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return response.badRequest({
        message: "用户名或密码错误",
        error: {
          code: "INVALID_CREDENTIALS",
          message: "用户名或密码错误",
        },
      });
    }

    // 检测是否SSO登录
    if (!user.password) {
      return response.badRequest({
        message: "该用户通过第三方登录，请使用对应的登录方式",
        error: {
          code: "SSO_USER",
          message: "该用户通过第三方登录，请使用对应的登录方式",
          details: user.accounts?.map((account) => ({
            provider: account.provider,
          })),
        },
      });
    }

    // 检测是否已验证邮箱
    // TODO: 接入动态config
    if (!user.emailVerified) {
      return response.badRequest({
        message: "请先验证邮箱后再登录",
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "请先验证邮箱后再登录",
        },
      });
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(user.password, password);
    if (!isPasswordValid.isValid) {
      return response.badRequest({
        message: "用户名或密码错误",
        error: {
          code: "INVALID_CREDENTIALS",
          message: "用户名或密码错误",
        },
      });
    }

    const expiredAtSeconds = 30 * 24 * 60 * 60; // 30天的秒数
    const expiredAt = new Date(Date.now() + expiredAtSeconds * 1000);
    const expiredAtUnix = Math.floor(expiredAt.getTime() / 1000); // 转换为Unix时间戳

    // 向数据库记录refresh token
    const dbRefreshToken = await prisma.refreshToken.create({
      data: {
        userUid: user.uid,
        expiresAt: expiredAt,
      },
    });

    // 分发令牌
    // Refresh Token
    const refreshToken = jwtTokenSign({
      inner: {
        uid: user.uid,
        tokenId: dbRefreshToken.id,
        exp: expiredAtUnix,
      },
      expired: "30d",
    });
    // Access Token
    const accessToken = jwtTokenSign({
      inner: {
        uid: user.uid,
        username: user.username,
        nickname: user.nickname,
      },
      expired: "10m",
    });

    // 设置HttpOnly Cookie
    if (token_transport === "cookie") {
      const cookieStore = await cookies();
      cookieStore.set({
        name: "REFRESH_TOKEN",
        value: refreshToken,
        httpOnly: true,
        maxAge: expiredAtSeconds,
        sameSite: "strict",
        path: "/api/auth/refresh",
        secure: process.env.NODE_ENV === "production",
      });
    }

    // 返回成功结果
    return response.ok({
      message: "登录成功",
      data: {
        access_token: accessToken,
        refresh_token: token_transport === "body" ? refreshToken : undefined,
      },
      ...(token_transport === "cookie" && {
        customHeaders: {
          "set-cookie": `REFRESH_TOKEN=${refreshToken}; Path=/api/auth/refresh; HttpOnly; SameSite=Strict; Max-Age=${expiredAtSeconds}`,
        },
      }),
    });
  } catch (error) {
    console.error("Login error:", error);
    return response.serverError({
      message: "登录失败，请稍后重试",
      error: {
        code: "SERVER_ERROR",
        message: "登录失败，请稍后重试",
      },
    });
  }
}

export async function register(
  {
    username,
    email,
    password,
    nickname,
    captcha_token,
  }: {
    username: string;
    email: string;
    password: string;
    nickname?: string;
    captcha_token: string;
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  }
) {
  // 创建响应构建器，根据配置选择环境
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction"
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  try {
    // 验证输入参数
    const validationResult = validateData(
      {
        username,
        email,
        password,
        nickname,
        captcha_token,
      },
      RegisterUserSchema
    );

    if (validationResult instanceof Response) return validationResult;

    // TODO: 验证验证码

    // 检查用户名或邮箱是否已存在
    const userExists = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (userExists) {
      return response.conflict({
        message: "用户名或邮箱已存在",
        error: {
          code: "USER_EXISTS",
          message: "用户名或邮箱已存在",
        },
      });
    }

    // 创建账户
    // 生成密码哈希
    const hashedPassword = await hashPassword(password);
    // 生成邮箱验证码
    const emailVerifyCode = emailUtils.generate();
    // 创建用户
    await prisma.user.create({
      data: {
        username,
        email,
        nickname,
        password: hashedPassword,
        emailVerifyCode,
      },
    });

    // TODO: 发送验证邮件

    return response.ok({
      message: "注册成功，请检查邮箱以验证账户",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return response.serverError({
      message: "注册失败，请稍后重试",
      error: {
        code: "SERVER_ERROR",
        message: "注册失败，请稍后重试",
      },
    });
  }
}

export async function refresh(
  {
    refresh_token,
    token_transport,
  }: {
    refresh_token?: string;
    token_transport: "cookie" | "body";
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  }
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction"
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  try {
    const validationResult = validateData(
      {
        token_transport,
        refresh_token,
      },
      RefreshTokenSchema
    );

    if (validationResult instanceof Response) return validationResult;

    const cookieStore = await cookies();
    const token = refresh_token || cookieStore.get("REFRESH_TOKEN")?.value;

    if (!token) {
      return response.unauthorized()
    }

    return response.ok(
      {
        data: {
          token
        }
      }
    )
  } catch (error) {
    console.error("Login error:", error);
    return response.serverError();
  }
}
