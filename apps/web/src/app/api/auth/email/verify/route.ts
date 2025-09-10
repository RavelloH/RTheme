import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { EmailVerificationSchema } from "@repo/shared-types/api/auth";
import { verifyEmail } from "@/actions/auth";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/auth/email/verify:
 *   post:
 *     summary: 邮箱验证
 *     description: 验证用户邮箱地址
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmailVerification'
 *     responses:
 *       200:
 *         description: 邮箱验证成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmailVerifySuccessResponse'
 *       400:
 *         description: 请求参数错误或验证码无效
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/EmailAlreadyVerifiedErrorResponse'
 *                 - $ref: '#/components/schemas/InvalidOrExpiredCodeErrorResponse'
 *       401:
 *         description: 未授权，Access Token 无效或不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedErrorResponse'
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
      EmailVerificationSchema
    );
    if (validationResult instanceof Response) return validationResult;

    const { code, captcha_token, access_token } = validationResult.data!;

    return await verifyEmail(
      {
        code,
        captcha_token,
        access_token,
      },
      {
        environment: "serverless",
      }
    );
  } catch (error) {
    console.error("Email verification route error:", error);
    return response.badGateway();
  }
}