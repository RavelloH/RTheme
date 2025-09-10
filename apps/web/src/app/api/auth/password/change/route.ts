import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { ChangePasswordSchema } from "@repo/shared-types/api/auth";
import { changePassword } from "@/actions/auth";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/auth/password/change:
 *   post:
 *     summary: 修改密码
 *     description: 修改用户密码，需要提供旧密码和access_token验证
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePassword'
 *     responses:
 *       200:
 *         description: 密码修改成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChangePasswordSuccessResponse'
 *       400:
 *         description: 请求参数错误或密码验证失败
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *                 - $ref: '#/components/schemas/NoPasswordSetErrorResponse'
 *                 - $ref: '#/components/schemas/InvalidOldPasswordErrorResponse'
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
      ChangePasswordSchema
    );
    if (validationResult instanceof Response) return validationResult;

    const { old_password, new_password, access_token } = validationResult.data!;

    return await changePassword(
      {
        old_password,
        new_password,
        access_token,
      },
      {
        environment: "serverless",
      }
    );
  } catch (error) {
    console.error("Change password route error:", error);
    return response.badGateway();
  }
}