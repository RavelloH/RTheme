import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { CaptchaVerifyRequestSchema } from "@repo/shared-types/api/captcha";
import { verifyChallenge } from "@/actions/captcha";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/captcha/verify:
 *   post:
 *     summary: 验证验证码
 *     description: 验证传入的验证码是否正确
 *     tags: [Captcha]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CaptchaVerifyRequest'
 *     responses:
 *       200:
 *         description: 验证成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaptchaVerifySuccessResponse'
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
export async function POST(request: Request) {
  try {
    // 验证请求数据
    const validationResult = await validateRequestJSON(
      request,
      CaptchaVerifyRequestSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { token, solutions } = validationResult.data!;

    return await verifyChallenge(
      {
        token,
        solutions,
      },
      {
        environment: "serverless",
      },
    );
  } catch (error) {
    console.error("Captcha verify error", error);
    return response.badGateway();
  }
}
