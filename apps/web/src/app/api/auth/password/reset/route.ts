import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { ResetPasswordSchema } from "@repo/shared-types/api/auth";
import { resetPassword } from "@/actions/auth";
import { connection } from "next/server";
const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/auth/password/reset:
 *   post:
 *     summary: 重置密码
 *     description: 使用重置码重置用户密码
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPassword'
 *     responses:
 *       200:
 *         description: 密码重置成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ResetPasswordSuccessResponse'
 *       400:
 *         description: 请求参数错误或重置码无效
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/InvalidResetCodeErrorResponse'
 *                 - $ref: '#/components/schemas/ExpiredResetCodeErrorResponse'
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
    const validationResult = await validateRequestJSON(
      request,
      ResetPasswordSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { code, new_password, captcha_token } = validationResult.data!;

    return (await resetPassword(
      {
        code,
        new_password,
        captcha_token,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Reset password route error:", error);
    return response.badGateway() as Response;
  }
}
