import {
  getStorageDetail,
  updateStorage,
  deleteStorage,
} from "@/actions/storage";
import ResponseBuilder from "@/lib/server/response";
import {
  validateGetRequest,
  validatePutRequest,
  validateDeleteRequest,
} from "@/lib/server/request-converter";
import {
  GetStorageDetailSchema,
  UpdateStorageSchema,
  DeleteStorageSchema,
} from "@repo/shared-types/api/storage";
import { connection } from "next/server";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/storage/{id}:
 *   get:
 *     summary: 获取存储提供商详情
 *     description: 需管理员身份，获取指定存储提供商的详细信息
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
 *     responses:
 *       200:
 *         description: 返回存储提供商详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetStorageDetailResponse'
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
 *   put:
 *     summary: 更新存储提供商
 *     description: 需管理员身份，更新指定存储提供商的信息
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
 *             $ref: '#/components/schemas/UpdateStorage'
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateStorageResponseWrapper'
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
 *       409:
 *         description: 存储名称已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictErrorResponse'
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
 *   delete:
 *     summary: 删除存储提供商
 *     description: 需管理员身份，删除指定的存储提供商
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  await connection();
  try {
    const { id } = await params;

    const validationResult = await validateGetRequest(
      request,
      GetStorageDetailSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token } = validationResult.data;

    return (await getStorageDetail(
      {
        access_token,
        id,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Storage Detail route error:", error);
    return response.badGateway() as Response;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

    const validationResult = validatePutRequest(request, UpdateStorageSchema);
    if (validationResult instanceof Response) return validationResult;

    const {
      access_token,
      name,
      displayName,
      baseUrl,
      isActive,
      isDefault,
      maxFileSize,
      pathTemplate,
      config,
    } = validationResult.data;

    return (await updateStorage(
      {
        access_token,
        id,
        name,
        displayName,
        baseUrl,
        isActive,
        isDefault,
        maxFileSize,
        pathTemplate,
        config,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Update Storage route error:", error);
    return response.badGateway() as Response;
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await params;

    const validationResult = validateDeleteRequest(
      request,
      DeleteStorageSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token } = validationResult.data;

    return (await deleteStorage(
      {
        access_token,
        ids: [id],
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Delete Storage route error:", error);
    return response.badGateway() as Response;
  }
}
