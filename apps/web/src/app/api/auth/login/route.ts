import { LoginSchema } from "@repo/shared-types/api/auth";
import { connection } from "next/server";

import { login } from "@/actions/auth";
import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
// 测试文件监控 - 修改3
const response = new ResponseBuilder("serverless");

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
 *             $ref: '#/components/schemas/Login'
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       400:
 *         description: 请求参数错误或用户状态异常
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/InvalidCredentialsErrorResponse'
 *                 - $ref: '#/components/schemas/SsoUserErrorResponse'
 *                 - $ref: '#/components/schemas/EmailNotVerifiedErrorResponse'
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
export async function POST(request: Request): Promise<Response> {
  await connection();
  try {
    // 验证请求数据
    const validationResult = await validateRequestJSON(request, LoginSchema);
    if (validationResult instanceof Response) return validationResult;

    const { username, password, token_transport, captcha_token } =
      validationResult.data!;

    return (await login(
      {
        username,
        password,
        token_transport,
        captcha_token: captcha_token,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Login route error:", error);
    return response.badGateway() as Response;
  }
}
