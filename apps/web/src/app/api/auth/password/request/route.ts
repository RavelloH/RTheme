import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { RequestPasswordResetSchema } from "@repo/shared-types/api/auth";
import { requestPasswordReset } from "@/actions/auth";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/auth/password/request:
 *   post:
 *     summary: 请求密码重置
 *     description: 通过邮箱地址请求密码重置，系统将发送重置链接到用户邮箱
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestPasswordReset'
 *     responses:
 *       200:
 *         description: 密码重置请求成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PasswordResetRequestSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
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
    const validationResult = await validateRequestJSON(
      request,
      RequestPasswordResetSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { email, captcha_token } = validationResult.data!;

    return (await requestPasswordReset(
      {
        email,
        captcha_token,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Request password reset route error:", error);
    return response.badGateway() as Response;
  }
}
