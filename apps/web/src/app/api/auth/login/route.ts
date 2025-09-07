import response from "@/app/api/_utils/response";
import { validateRequestJSON } from "@/app/api/_utils/validator";
import limitControl from "../../_utils/rateLimit";
import { LoginUserSchema } from "@repo/shared-types/api/auth";
import prisma from "@/app/lib/prisma";
import { verifyPassword } from "../../_utils/password";

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

    const { username, password } = validationResult.data!;

    // TODO: 校验验证码

    // 检查用户名或邮箱是否已存在
    const user = await prisma.user.findFirst({
      where: {
        username,
      },
      select: {
        password: true,
        accounts: true,
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

    // 分发令牌
    return response.ok();
  } catch (error) {
    console.error("Login error:", error);
    return response.serverError({
      message: "登录失败，请稍后重试",
    });
  }
}
