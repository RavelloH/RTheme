import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { LoginUserSchema } from "@repo/shared-types/api/auth";
import { login, loginWithRateLimit } from "@/actions/auth";

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
export async function POST(request: Request) {
  try {
    // 创建serverless环境的响应构建器
    const response = new ResponseBuilder("serverless");
    
    // 验证请求数据
    const validationResult = await validateRequestJSON(
      request,
      LoginUserSchema
    );
    if (validationResult instanceof Response) return validationResult;

    const { username, password, token_transport, captcha_token } =
      validationResult.data!;

    const loginResult = await login({
      username,
      password,
      token_transport,
      captcha_token: captcha_token,
    });

    // login函数现在返回ApiResponse对象，我们需要转换为NextResponse
    if ('success' in loginResult) {
      if (loginResult.success) {
        return response.ok({
          message: loginResult.message || "登录成功",
          data: loginResult.data,
        });
      } else {
        return response.badRequest({
          message: loginResult.message || "登录失败",
          error: loginResult.error,
        });
      }
    }

    // 兜底情况，返回未知错误
    return response.serverError({
      message: "登录过程发生未知错误"
    });
  } catch (error) {
    console.error("Login route error:", error);
    const response = new ResponseBuilder("serverless");
    return response.badGateway();
  }
}
