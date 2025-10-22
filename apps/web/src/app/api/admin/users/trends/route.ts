import { getUsersTrends } from "@/actions/user";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetUsersTrendsSchema } from "@repo/shared-types/api/user";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/users/trends:
 *   get:
 *     summary: 获取用户增长趋势数据
 *     description: 需管理员身份，获取最近N天的用户增长趋势数据，包括总用户数、新增用户、活跃用户
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *         description: 获取最近多少天的数据
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 30
 *         description: 数据点数量
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: 返回用户趋势数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetUsersTrendsSuccessResponse'
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
  try {
    // 使用 validateGetRequest 自动从查询参数和 Authorization header 中提取并验证数据
    const validationResult = validateGetRequest(request, GetUsersTrendsSchema);
    if (validationResult instanceof Response) return validationResult;

    const { access_token, days, count } = validationResult.data;

    return (await getUsersTrends(
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
    console.error("Get users trends route error:", error);
    return response.badGateway() as Response;
  }
}
