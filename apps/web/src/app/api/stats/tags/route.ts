import { getTagsStats } from "@/actions/stat";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetTagsStatsSchema } from "@repo/shared-types/api/stats";
import { connection } from "next/server";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/stats/tags:
 *   get:
 *     summary: 获取标签统计数据
 *     description: 需管理员/编辑身份，获取标签统计信息
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *         description: 是否强制刷新缓存
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Tags
 *     responses:
 *       200:
 *         description: 返回标签统计数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetTagsStatsSuccessResponse'
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
    const validationResult = await validateGetRequest(
      request,
      GetTagsStatsSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token, force } = validationResult.data;

    return (await getTagsStats(
      {
        access_token,
        force,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Tags Stats route error:", error);
    return response.badGateway() as Response;
  }
}
