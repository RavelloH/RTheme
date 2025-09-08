import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { RegisterUserSchema } from "@repo/shared-types/api/auth";
import limitControl from "@/lib/server/rateLimit";
import { hashPassword } from "@/lib/server/password";
import emailUtils from "@/lib/server/email";

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 注册新用户
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUser'
 *     responses:
 *       200:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       409:
 *         description: 用户名或邮箱已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictErrorResponse'
 *       429:
 *         description: 请求过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerErrorResponse'
 */
export async function POST(request: Request) {
  try {
    // 创建serverless环境的响应构建器
    const response = new ResponseBuilder("serverless");
    
    // 速率控制
    if (!(await limitControl(request))) {
      return response.tooManyRequests();
    }

    // 验证请求数据
    const validationResult = await validateRequestJSON(
      request,
      RegisterUserSchema
    );
    if (validationResult instanceof Response) return validationResult;

    const { username, email, password, nickname } = validationResult.data!;

    // TODO: 校验验证码

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
    // 生成邮箱验证码\
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
    const response = new ResponseBuilder("serverless");
    return response.serverError({
      message: "注册失败，请稍后重试",
    });
  }
}
