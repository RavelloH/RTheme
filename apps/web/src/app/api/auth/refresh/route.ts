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
 *     description: 传入 REFRESH_TOKEN 刷新 ACCESS_TOKEN。可以通过请求体或 Cookie 传递 REFRESH_TOKEN。
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshToken'
 */
export async function POST(request: Request) {
  try {
    // 验证请求数据
    const validationResult = await validateRequestJSON(
      request,
      RefreshTokenSchema
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
      }
    );
  } catch (error) {
    console.error("Login route error:", error);
    return response.badGateway();
  }
}
