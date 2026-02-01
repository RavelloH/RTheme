import { DeleteStorageSchema } from "@repo/shared-types/api/storage";
import { connection } from "next/server";

import { deleteStorage } from "@/actions/storage";
import { validateDeleteRequest } from "@/lib/server/request-converter";
import ResponseBuilder from "@/lib/server/response";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/storage/batch:
 *   delete:
 *     summary: 批量删除存储提供商
 *     description: 需管理员身份，批量删除多个存储提供商
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
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 存储提供商ID列表
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteStorageResponseWrapper'
 *       400:
 *         description: 请求参数错误或存储提供商有关联的媒体文件
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

export async function DELETE(request: Request): Promise<Response> {
  await connection();
  try {
    const validationResult = validateDeleteRequest(
      request,
      DeleteStorageSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token, ids } = validationResult.data;

    return (await deleteStorage(
      {
        access_token,
        ids,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Batch Delete Storage route error:", error);
    return response.badGateway() as Response;
  }
}
