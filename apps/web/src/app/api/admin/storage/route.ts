import { getStorageList, createStorage } from "@/actions/storage";
import ResponseBuilder from "@/lib/server/response";
import {
  validateGetRequest,
  validatePostRequest,
} from "@/lib/server/request-converter";
import {
  GetStorageListSchema,
  CreateStorageSchema,
} from "@repo/shared-types/api/storage";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/storage:
 *   get:
 *     summary: 获取存储提供商列表
 *     description: 需管理员身份，获取存储提供商列表
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 25
 *         description: 每页数量
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, name, type, createdAt, updatedAt]
 *           default: createdAt
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序方向
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [LOCAL, AWS_S3, GITHUB_PAGES, VERCEL_BLOB]
 *         description: 存储类型筛选
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: 状态筛选
 *       - in: query
 *         name: isDefault
 *         schema:
 *           type: boolean
 *         description: 默认存储筛选
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Storage
 *     responses:
 *       200:
 *         description: 返回存储提供商列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetStorageListResponse'
 *       401:
 *         description: 未授权
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
 *   post:
 *     summary: 创建存储提供商
 *     description: 需管理员身份，创建新的存储提供商
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Storage
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateStorage'
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateStorageResponseWrapper'
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
 */

export async function GET(request: Request): Promise<Response> {
  try {
    const validationResult = validateGetRequest(request, GetStorageListSchema);
    if (validationResult instanceof Response) return validationResult;

    const {
      access_token,
      page = 1,
      pageSize = 25,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      type,
      isActive,
      isDefault,
    } = validationResult.data;

    return (await getStorageList(
      {
        access_token,
        page: Number(page),
        pageSize: Number(pageSize),
        sortBy: sortBy as "id" | "name" | "type" | "createdAt" | "updatedAt",
        sortOrder: sortOrder as "asc" | "desc",
        search,
        type,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Storage List route error:", error);
    return response.badGateway() as Response;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const validationResult = validatePostRequest(request, CreateStorageSchema);
    if (validationResult instanceof Response) return validationResult;

    const {
      access_token,
      name,
      type,
      displayName,
      baseUrl,
      isActive = true,
      isDefault = false,
      maxFileSize = 52428800,
      pathTemplate = "/{year}/{month}/{filename}",
      config = {},
    } = validationResult.data;

    return (await createStorage(
      {
        access_token,
        name,
        type,
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
    console.error("Create Storage route error:", error);
    return response.badGateway() as Response;
  }
}
