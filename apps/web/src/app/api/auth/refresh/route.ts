import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { RefreshTokenSchema } from "@repo/shared-types/api/auth";
import { refresh } from "@/actions/auth";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     summary: 令牌刷新
 *     description: 传入 REFRESH_TOKEN 刷新 ACCESS_TOKEN。可以通过请求体传递 refresh_token，或在 Cookie 中携带名为 REFRESH_TOKEN 的令牌。
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshToken'
 *     responses:
 *       200:
 *         description: 令牌刷新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       400:
 *         description: 请求参数错误或刷新令牌无效
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/InvalidCredentialsErrorResponse'
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
    // 验证请求数据
    const validationResult = await validateRequestJSON(
      request,
      RefreshTokenSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { token_transport, refresh_token } = validationResult.data!;

    return await refresh(
      {
        token_transport,
        refresh_token,
      },
      {
        environment: "serverless",
      },
    );
  } catch (error) {
    console.error("Login route error:", error);
    return response.badGateway();
  }
}
