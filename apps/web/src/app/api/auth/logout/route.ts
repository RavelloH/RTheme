import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { LogoutSchema } from "@repo/shared-types/api/auth";
import { logout } from "@/actions/auth";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: 退出登录
 *     description: 传入 REFRESH_TOKEN 来退出登录。可以通过请求体传递 refresh_token，或在 Cookie 中携带名为 REFRESH_TOKEN 的令牌。
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Logout'
 *     responses:
 *       200:
 *         description: 退出登录成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutSuccessResponse'
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
export async function POST(request: Request): Promise<Response> {
  try {
    // 验证请求数据
    const validationResult = await validateRequestJSON(request, LogoutSchema);
    if (validationResult instanceof Response) return validationResult;

    const { refresh_token } = validationResult.data!;

    return (await logout(
      {
        refresh_token,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Logout route error:", error);
    return response.badGateway() as Response;
  }
}
