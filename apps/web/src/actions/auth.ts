"use server";

import { validateData } from "@/lib/server/validator";
import limitControl from "@/lib/server/rateLimit";
import {
  LoginUserSchema,
  RegisterUserSchema,
  RefreshTokenSchema,
  EmailVerificationSchema,
  ResendEmailVerificationSchema,
  ChangePasswordSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
} from "@repo/shared-types/api/auth";
import prisma from "@/lib/server/prisma";
import { verifyPassword } from "@/lib/server/password";
import { jwtTokenSign, jwtTokenVerify } from "@/lib/server/jwt";
import ResponseBuilder from "@/lib/server/response";
import { cookies, headers } from "next/headers";
import { hashPassword } from "@/lib/server/password";
import emailUtils from "@/lib/server/email";
import { after } from "next/server";

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
  },
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  // 验证输入参数
  const validationResult = validateData(
    {
      username,
      password,
      token_transport,
      captcha_token,
    },
    LoginUserSchema,
  );

  if (validationResult instanceof Response) return validationResult;

  // TODO: 验证验证码

  try {
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

    const expiredAtSeconds = 30 * 24 * 60 * 60; // 30天
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
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });
      cookieStore.set({
        name: "ACCESS_TOKEN",
        value: accessToken,
        httpOnly: true,
        maxAge: 600,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });
    }

    // 返回成功结果
    return response.ok({
      message: "登录成功",
      data: {
        access_token: token_transport === "body" ? accessToken : undefined,
        refresh_token: token_transport === "body" ? refreshToken : undefined,
      },
      ...(token_transport === "cookie" && {
        customHeaders: new Headers([
          [
            "set-cookie",
            `REFRESH_TOKEN=${refreshToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${expiredAtSeconds}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
          ],
          [
            "set-cookie",
            `ACCESS_TOKEN=${accessToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${10 * 60}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
          ],
        ]),
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
  },
) {
  // 创建响应构建器，根据配置选择环境
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  // 验证输入参数
  const validationResult = validateData(
    {
      username,
      email,
      password,
      nickname,
      captcha_token,
    },
    RegisterUserSchema,
  );
  if (validationResult instanceof Response) return validationResult;

  // TODO: 验证验证码

  try {
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
    const user = await prisma.user.create({
      data: {
        username,
        email,
        nickname,
        password: hashedPassword,
        emailVerifyCode,
      },
    });

    // 赋予第一个注册用户管理员权限
    if (user.uid === 1) {
      await prisma.user.update({
        where: { uid: user.uid },
        data: {
          role: "ADMIN",
        },
      });
    }

    // TODO: 发送验证邮件
    // TODO: 接入动态config

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
  },
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  // 验证输入参数
  const validationResult = validateData(
    {
      token_transport,
      refresh_token,
    },
    RefreshTokenSchema,
  );
  if (validationResult instanceof Response) return validationResult;

  try {
    const cookieStore = await cookies();
    const token = refresh_token || cookieStore.get("REFRESH_TOKEN")?.value;

    if (!token) {
      return response.unauthorized();
    }

    // 验证&解析 Refresh Token
    const decoded = jwtTokenVerify(token);
    if (!decoded) {
      return response.unauthorized();
    }

    // 数据库验证
    const { tokenId, uid } = decoded;
    const dbToken = await prisma.refreshToken.findUnique({
      where: {
        id: tokenId as string,
        userUid: uid as number,
      },
      select: {
        id: true,
        userUid: true,
        user: {
          select: {
            uid: true,
            username: true,
            nickname: true,
          },
        },
      },
    });
    if (!dbToken) {
      return response.unauthorized();
    }

    // 创建新 Access Token
    const accessToken = jwtTokenSign({
      inner: {
        uid: dbToken.user.uid,
        username: dbToken.user.username,
        nickname: dbToken.user.nickname,
      },
      expired: "10m",
    });

    // 清理数据库中过期的 Refresh Token
    after(async () => {
      const now = new Date();
      await prisma.refreshToken.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
    });

    // 返回成功结果
    if (token_transport === "cookie") {
      cookieStore.set({
        name: "ACCESS_TOKEN",
        value: accessToken,
        httpOnly: true,
        maxAge: 600,
        sameSite: "strict",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return response.ok({
      message: "刷新成功",
      data: {
        access_token: token_transport === "body" ? accessToken : undefined,
      },
      ...(token_transport === "cookie" && {
        customHeaders: {
          "set-cookie": `ACCESS_TOKEN=${accessToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=600${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        },
      }),
    });
  } catch (error) {
    console.error("Login error:", error);
    return response.serverError();
  }
}

export async function verifyEmail(
  {
    code,
    captcha_token,
    email,
  }: {
    code: string;
    captcha_token: string;
    email: string;
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  },
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  // 验证输入参数
  const validationResult = validateData(
    {
      code,
      captcha_token,
      email,
    },
    EmailVerificationSchema,
  );

  if (validationResult instanceof Response) return validationResult;

  // TODO: 验证验证码

  try {
    // 根据邮箱查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        uid: true,
        emailVerifyCode: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return response.badRequest({
        message: "邮箱已验证，无需重复验证",
        error: {
          code: "EMAIL_ALREADY_VERIFIED",
          message: "邮箱已验证，无需重复验证",
        },
      });
    }

    if (user.emailVerified) {
      return response.badRequest({
        message: "邮箱已验证，无需重复验证",
        error: {
          code: "EMAIL_ALREADY_VERIFIED",
          message: "邮箱已验证，无需重复验证",
        },
      });
    }

    if (emailUtils.verify(code, user.emailVerifyCode || "")) {
      // 更新用户状态
      await prisma.user.update({
        where: { uid: user.uid },
        data: {
          emailVerified: true,
          emailVerifyCode: null,
        },
      });
      return response.ok({
        message: "邮箱验证成功",
      });
    } else {
      return response.badRequest({
        message: "验证码无效或已过期",
        error: {
          code: "INVALID_OR_EXPIRED_CODE",
          message: "验证码无效或已过期",
        },
      });
    }
  } catch (error) {
    console.error("Email verification error:", error);
    return response.serverError();
  }
}

export async function changePassword(
  {
    old_password,
    new_password,
    access_token,
  }: {
    old_password: string;
    new_password: string;
    access_token?: string;
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  },
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  // 验证输入参数
  const validationResult = validateData(
    {
      old_password,
      new_password,
      access_token,
    },
    ChangePasswordSchema,
  );
  if (validationResult instanceof Response) return validationResult;

  try {
    // 新旧密码不能相同
    if (old_password === new_password) {
      return response.badRequest({
        message: "新密码不能与旧密码相同",
        error: {
          code: "PASSWORDS_IDENTICAL",
          message: "新密码不能与旧密码相同",
        },
      });
    }
    // 从 cookie 或请求体中获取 Access Token
    const cookieStore = await cookies();
    const token = access_token || cookieStore.get("ACCESS_TOKEN")?.value || "";
    // 验证 Access Token
    const decoded = jwtTokenVerify(token);
    if (!decoded) {
      return response.unauthorized();
    }
    const { uid } = decoded;
    if (!uid) {
      return response.unauthorized();
    }
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { uid: uid as number },
      select: {
        uid: true,
        password: true,
        accounts: true,
      },
    });
    if (!user) {
      return response.unauthorized();
    }
    // 检测是否无密码
    if (!user.password) {
      return response.badRequest({
        message: "未设置密码。如需设置密码，请重置密码",
        error: {
          code: "NO_PASSWORD_SET",
          message: "未设置密码。如需设置密码，请重置密码",
        },
      });
    }
    // 验证旧密码
    const isOldPasswordValid = await verifyPassword(
      user.password,
      old_password,
    );
    if (!isOldPasswordValid.isValid) {
      return response.badRequest({
        message: "旧密码错误",
        error: {
          code: "INVALID_OLD_PASSWORD",
          message: "旧密码错误",
        },
      });
    }
    // 哈希新密码
    const hashedNewPassword = await hashPassword(new_password);
    // 更新密码
    await prisma.user.update({
      where: { uid: user.uid },
      data: {
        password: hashedNewPassword,
      },
    });
    // 注销所有会话
    await prisma.refreshToken.deleteMany({
      where: { userUid: user.uid },
    });
    // 返回成功结果
    return response.ok({
      message: "密码修改成功",
    });
  } catch (error) {
    console.error("Change password error:", error);
    return response.serverError();
  }
}

export async function requestPasswordReset(
  {
    email,
    captcha_token,
  }: {
    email: string;
    captcha_token: string;
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  },
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );
  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }
  // 验证输入参数
  const validationResult = validateData(
    {
      email,
      captcha_token,
    },
    RequestPasswordResetSchema,
  );
  if (validationResult instanceof Response) return validationResult;

  // TODO: 验证验证码

  try {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        uid: true,
        email: true,
      },
    });
    if (!user) {
      return response.ok({
        message: "已发送重置密码链接，链接15分钟内有效",
      });
    } else {
      // 添加到密码重置表
      const passwordReset = await prisma.passwordReset.create({
        data: {
          userUid: user.uid,
        },
      });
      const passwordResetCode = passwordReset.id;
      // TODO：发送重置邮件
      // TODO: 根据站点有无设置email确定是否过期
      // const resetLink = `/reset-password?code=${passwordResetCode}`;
      // 清理15分钟之前的请求
      after(async () => {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        await prisma.passwordReset.deleteMany({
          where: {
            createdAt: { lt: fifteenMinutesAgo },
          },
        });
      });
      // 返回成功结果
      return response.ok({
        message: "已发送重置密码链接，链接15分钟内有效",
      });
    }
  } catch (error) {
    console.error("Request password reset error:", error);
    return response.serverError();
  }
}

export async function resetPassword(
  {
    code,
    new_password,
    captcha_token,
  }: {
    code: string;
    new_password: string;
    captcha_token: string;
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  },
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  // 验证输入参数
  const validationResult = validateData(
    {
      code,
      new_password,
      captcha_token,
    },
    ResetPasswordSchema,
  );
  if (validationResult instanceof Response) return validationResult;

  // TODO: 验证验证码

  try {
    // 查找密码重置请求
    const passwordReset = await prisma.passwordReset.findUnique({
      where: { id: code },
      select: {
        id: true,
        userUid: true,
        createdAt: true,
      },
    });
    if (!passwordReset) {
      return response.badRequest({
        message: "无效的重置码",
        error: {
          code: "INVALID_RESET_CODE",
          message: "无效的重置码",
        },
      });
    }
    // 检查是否过期（15分钟内有效）
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (passwordReset.createdAt < fifteenMinutesAgo) {
      return response.badRequest({
        message: "重置码已过期",
        error: {
          code: "EXPIRED_RESET_CODE",
          message: "重置码已过期",
        },
      });
    }
    // 更改密码
    const hashedNewPassword = await hashPassword(new_password);
    await prisma.user.update({
      where: { uid: passwordReset.userUid },
      data: {
        password: hashedNewPassword,
      },
    });

    // 删除重置请求
    await prisma.passwordReset.delete({
      where: { id: passwordReset.id },
    });
    // 注销所有会话
    await prisma.refreshToken.deleteMany({
      where: { userUid: passwordReset.userUid },
    });
    // 返回成功结果
    return response.ok({
      message: "密码重置成功",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return response.serverError();
  }
}

export async function resendEmailVerification(
  {
    email,
    captcha_token,
  }: {
    email: string;
    captcha_token: string;
  },
  serverConfig?: {
    environment?: "serverless" | "serveraction";
  },
) {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 速率控制
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  // 验证输入参数
  const validationResult = validateData(
    {
      email,
      captcha_token,
    },
    ResendEmailVerificationSchema,
  );
  if (validationResult instanceof Response) return validationResult;

  // TODO: 验证验证码

  try {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        uid: true,
        email: true,
        emailVerified: true,
      },
    });

    // 防止遍历
    if (!user) {
      return response.ok({
        message: "验证码已重新发送，请检查邮箱",
      });
    }

    // 如果邮箱已验证
    if (user.emailVerified) {
      return response.ok({
        message: "验证码已重新发送，请检查邮箱",
      });
    }

    // 重新生成邮箱验证码
    const emailVerifyCode = emailUtils.generate();

    // 更新用户的验证码
    await prisma.user.update({
      where: { uid: user.uid },
      data: {
        emailVerifyCode,
      },
    });

    // TODO: 发送验证邮件

    return response.ok({
      message: "验证码已重新发送，请检查邮箱",
    });
  } catch (error) {
    console.error("Resend email verification error:", error);
    return response.serverError({
      message: "发送失败，请稍后重试",
      error: {
        code: "SERVER_ERROR",
        message: "发送失败，请稍后重试",
      },
    });
  }
}
