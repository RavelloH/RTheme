import { GetAuditLogsSchema } from "@repo/shared-types/api/audit";
import { connection } from "next/server";

import { getAuditLogs } from "@/actions/audit";
import { validateGetRequest } from "@/lib/server/request-converter";
import ResponseBuilder from "@/lib/server/response";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/audit-logs:
 *   get:
 *     summary: 获取审计日志
 *     description: 需管理员身份，分页获取系统审计日志，支持过滤和排序
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
 *           maximum: 500
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, timestamp, action, resource, userUid]
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: 排序顺序
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 按操作类型过滤
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: 按资源类型过滤
 *       - in: query
 *         name: userUid
 *         schema:
 *           type: integer
 *         description: 按用户UID过滤
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始日期
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束日期
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词（搜索描述、资源ID、IP地址、User Agent、操作类型、资源类型、用户名等）
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: 返回审计日志列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetAuditLogsSuccessResponse'
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
      GetAuditLogsSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const {
      access_token,
      page,
      pageSize,
      sortBy,
      sortOrder,
      action,
      resource,
      userUid,
      startDate,
      endDate,
      search,
    } = validationResult.data;

    return (await getAuditLogs(
      {
        access_token,
        page,
        pageSize,
        sortBy,
        sortOrder,
        action,
        resource,
        userUid,
        startDate,
        endDate,
        search,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Audit Logs route error:", error);
    return response.badGateway() as Response;
  }
}
