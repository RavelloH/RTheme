import response from "@/app/api/_utils/response";
import { validateRequestJSON } from "@/app/api/_utils/validator";
import limitControl from "../../_utils/rateLimit";
import { LoginUserSchema } from "@repo/shared-types/api/auth";
import prisma from "@/app/lib/prisma";
import { verifyPassword } from "../../_utils/password";
import { jwtTokenSign } from "../../_utils/jwt";

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: 用户登录
 *     description: 登录并获取 ACCESS_TOKEN 和 REFRESH_TOKEN
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginUser'
 */
export async function POST(request: Request) {
  try {
    // 速率控制
    if (!(await limitControl(request))) {
      return response.tooManyRequests();
    }

    // 验证请求数据
    const validationResult = await validateRequestJSON(
      request,
      LoginUserSchema
    );
    if (validationResult instanceof Response) return validationResult;

    const { username, password, token_transport } = validationResult.data!;

    // TODO: 校验验证码

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

    // 根据 token_transport 决定令牌传输方式
    if (token_transport === "cookie") {
      // 设置 RefreshToken为HttpOnly Cookie
      const refreshCookie = `REFRESH_TOKEN=${refreshToken}; Path=/api/auth/refresh; HttpOnly; SameSite=Strict; Max-Age=${expiredAtSeconds}`;
      // 直接返回 AccessToken
      return response.ok({
        message: "登录成功",
        data: {
          access_token: accessToken,
        },
        customHeaders: {
          "Set-Cookie": refreshCookie,
        },
      });
    }

    if (token_transport === "body") {
      return response.ok({
        message: "登录成功",
        data: {
          access_token: accessToken,
          refresh_token: refreshToken,
        },
      });
    }
    return response.ok();
  } catch (error) {
    console.error("Login error:", error);
    return response.serverError({
      message: "登录失败，请稍后重试",
    });
  }
}
