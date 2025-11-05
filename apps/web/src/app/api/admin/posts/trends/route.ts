import { getPostsTrends } from "@/actions/post";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetPostsTrendsSchema } from "@repo/shared-types/api/post";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/posts/trends:
 *   get:
 *     summary: 获取文章趋势数据
 *     description: 需管理员/编辑/作者身份，获取文章增长趋势
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: 统计天数（默认365天）
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *         description: 数据点数量（默认30个）
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Posts
 *     responses:
 *       200:
 *         description: 返回文章趋势数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostsTrendsSuccessResponse'
 */
export async function GET(request: Request): Promise<Response> {
  try {
    const validationResult = validateGetRequest(request, GetPostsTrendsSchema);
    if (validationResult instanceof Response) return validationResult;

    const { access_token, days, count } = validationResult.data;

    return (await getPostsTrends(
      {
        access_token,
        days,
        count,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Posts Trends route error:", error);
    return response.badGateway() as Response;
  }
}
