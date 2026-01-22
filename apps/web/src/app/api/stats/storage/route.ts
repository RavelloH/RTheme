import { getStorageStats } from "@/actions/stat";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetStorageStatsSchema } from "@repo/shared-types/api/storage";
import { connection } from "next/server";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/stats/storage:
 *   get:
 *     summary: 获取存储统计数据
 *     description: 需管理员身份，获取存储统计信息
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *         description: 是否强制刷新缓存
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Storage
 *     responses:
 *       200:
 *         description: 返回存储统计数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetStorageStatsSuccessResponse'
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
      GetStorageStatsSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token, force } = validationResult.data;

    return (await getStorageStats(
      {
        access_token,
        force,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Storage Stats route error:", error);
    return response.badGateway() as Response;
  }
}
