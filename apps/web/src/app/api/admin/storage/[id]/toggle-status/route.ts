import { toggleStorageStatus } from "@/actions/storage";
import ResponseBuilder from "@/lib/server/response";
import { validatePatchRequest } from "@/lib/server/request-converter";
import { ToggleStorageStatusSchema } from "@repo/shared-types/api/storage";
import { connection } from "next/server";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/storage/{id}/toggle-status:
 *   patch:
 *     summary: 切换存储提供商状态
 *     description: 需管理员身份，切换指定存储提供商的激活/停用状态
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
 *               isActive:
 *                 type: boolean
 *                 description: 新的状态
 *     responses:
 *       200:
 *         description: 状态切换成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ToggleStorageStatusResponseWrapper'
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
  await connection();
  try {
    const { id } = await params;

    const validationResult = validatePatchRequest(
      request,
      ToggleStorageStatusSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token, isActive } = validationResult.data;

    return (await toggleStorageStatus(
      {
        access_token,
        id,
        isActive,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Toggle Storage Status route error:", error);
    return response.badGateway() as Response;
  }
}
