import { getCategoriesStats } from "@/actions/stat";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetCategoriesStatsSchema } from "@repo/shared-types/api/stats";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/stats/categories:
 *   get:
 *     summary: 获取分类统计数据
 *     description: 需管理员/编辑身份，获取分类统计信息
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *         description: 是否强制刷新缓存
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: 返回分类统计数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCategoriesStatsSuccessResponse'
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
  try {
    const validationResult = validateGetRequest(
      request,
      GetCategoriesStatsSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token, force } = validationResult.data;

    return (await getCategoriesStats(
      {
        access_token,
        force,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Categories Stats route error:", error);
    return response.badGateway() as Response;
  }
}
