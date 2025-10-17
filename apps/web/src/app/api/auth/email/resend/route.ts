import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { ResendEmailVerificationSchema } from "@repo/shared-types/api/auth";
import { resendEmailVerification } from "@/actions/auth";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/auth/email-verify/resend:
 *   post:
 *     summary: 重发邮箱验证码
 *     description: 重新发送邮箱验证码到用户邮箱，用于邮箱验证
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResendEmailVerification'
 *     responses:
 *       200:
 *         description: 验证码发送成功（为安全起见，即使用户不存在也返回成功）
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResendEmailVerificationSuccessResponse'
 *       400:
 *         description: 请求参数错误或邮箱已验证
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/EmailAlreadyVerifiedErrorResponse'
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
      ResendEmailVerificationSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { email, captcha_token } = validationResult.data!;

    return (await resendEmailVerification(
      {
        email,
        captcha_token,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Resend email verification route error:", error);
    return response.badGateway() as Response;
  }
}
