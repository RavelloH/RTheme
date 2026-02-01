import { GetUsersStatsSchema } from "@repo/shared-types/api/stats";
import { connection } from "next/server";

import { getUsersStats } from "@/actions/stat";
import { validateGetRequest } from "@/lib/server/request-converter";
import ResponseBuilder from "@/lib/server/response";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/stats/users:
 *   get:
 *     summary: 获取用户统计数据
 *     description: 需管理员身份，获取用户统计信息
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *         description: 是否强制刷新缓存
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: 返回用户数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetUsersStatsSuccessResponse'
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
      GetUsersStatsSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token, force } = validationResult.data;

    return (await getUsersStats(
      {
        access_token,
        force,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Users Stats route error:", error);
    return response.badGateway() as Response;
  }
}
