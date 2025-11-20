import { setDefaultStorage } from "@/actions/storage";
import ResponseBuilder from "@/lib/server/response";
import { validatePatchRequest } from "@/lib/server/request-converter";
import { SetDefaultStorageSchema } from "@repo/shared-types/api/storage";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/storage/{id}/set-default:
 *   patch:
 *     summary: 设置默认存储提供商
 *     description: 需管理员身份，将指定存储提供商设为默认存储
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 存储提供商ID
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Storage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               access_token:
 *                 type: string
 *                 description: 访问令牌
 *     responses:
 *       200:
 *         description: 设置成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SetDefaultStorageResponseWrapper'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BadRequestErrorResponse'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedErrorResponse'
 *       404:
 *         description: 存储提供商不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundErrorResponse'
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

    const validationResult = validatePatchRequest(
      request,
      SetDefaultStorageSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token } = validationResult.data;

    return (await setDefaultStorage(
      {
        access_token,
        id,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Set Default Storage route error:", error);
    return response.badGateway() as Response;
  }
}
