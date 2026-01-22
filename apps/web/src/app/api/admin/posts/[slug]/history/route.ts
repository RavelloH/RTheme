import { getPostHistory } from "@/actions/post";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetPostHistorySchema } from "@repo/shared-types/api/post";
import { connection } from "next/server";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/posts/{slug}/history:
 *   get:
 *     summary: 获取文章历史版本列表
 *     description: 获取指定文章的所有历史版本，需要身份验证。ADMIN/EDITOR 可查看所有文章，AUTHOR 只能查看自己的文章。
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: 文章 slug
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
 *           enum: [timestamp]
 *           default: timestamp
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: 排序顺序
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Admin
 *       - Posts
 *     responses:
 *       200:
 *         description: 返回文章历史版本列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostHistorySuccessResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: 未授权，Access Token 无效或不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedErrorResponse'
 *       403:
 *         description: 权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ForbiddenErrorResponse'
 *       404:
 *         description: 文章不存在
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
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  await connection();
  try {
    const { slug } = await params;

    // 使用 validateGetRequest 自动从查询参数和 Authorization header 中提取并验证数据
    const validationResult = await validateGetRequest(
      request,
      GetPostHistorySchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token, page, pageSize, sortBy, sortOrder } =
      validationResult.data;

    return (await getPostHistory(
      {
        access_token,
        slug,
        page,
        pageSize,
        sortBy,
        sortOrder,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get post history route error:", error);
    return response.badGateway() as Response;
  }
}
