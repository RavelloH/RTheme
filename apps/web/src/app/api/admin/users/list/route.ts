import { GetUsersListSchema } from "@repo/shared-types/api/user";
import { connection } from "next/server";

import { getUsersList } from "@/actions/user";
import { validateGetRequest } from "@/lib/server/request-converter";
import ResponseBuilder from "@/lib/server/response";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/users/list:
 *   get:
 *     summary: 获取用户列表
 *     description: 需管理员身份，分页获取用户列表，支持排序、筛选和搜索
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 25
 *         description: 每页数量
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [uid, username, createdAt, lastUseAt]
 *           default: uid
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: 排序方式
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN, EDITOR, AUTHOR]
 *         description: 按角色筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, SUSPENDED, NEEDS_UPDATE]
 *         description: 按状态筛选
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词（用户名、昵称、邮箱）
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: 返回用户列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetUsersListSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: 未授权，Access Token 无效或不存在，权限不足
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
export async function GET(request: Request): Promise<Response> {
  await connection();
  try {
    // 使用 validateGetRequest 自动从查询参数和 Authorization header 中提取并验证数据
    const validationResult = await validateGetRequest(
      request,
      GetUsersListSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const {
      access_token,
      page,
      pageSize,
      sortBy,
      sortOrder,
      role,
      status,
      search,
    } = validationResult.data;

    return (await getUsersList(
      {
        access_token,
        page,
        pageSize,
        sortBy,
        sortOrder,
        role,
        status,
        search,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get users list route error:", error);
    return response.badGateway() as Response;
  }
}
