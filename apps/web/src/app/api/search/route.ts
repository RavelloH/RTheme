import { SearchPostsSchema } from "@repo/shared-types/api/search";
import { connection } from "next/server";

import { searchPosts } from "@/actions/search";

/**
 * @openapi
 * /api/search:
 *   get:
 *     summary: 搜索文章
 *     description: 使用全文搜索功能搜索文章。支持标题、内容或全文搜索，使用 PostgreSQL tsvector 和自定义分词器。
 *     tags: [Search]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *           maxLength: 200
 *         description: 搜索关键词
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: 每页数量
 *       - in: query
 *         name: searchIn
 *         schema:
 *           type: string
 *           enum: [title, content, both]
 *           default: both
 *         description: 搜索范围
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED]
 *         description: 文章状态筛选
 *     responses:
 *       200:
 *         description: 成功返回搜索结果
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           slug:
 *                             type: string
 *                           title:
 *                             type: string
 *                           excerpt:
 *                             type: [string, null]
 *                           status:
 *                             type: string
 *                           publishedAt:
 *                             type: [string, null]
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           author:
 *                             type: object
 *                             properties:
 *                               uid:
 *                                 type: integer
 *                               username:
 *                                 type: string
 *                               nickname:
 *                                 type: [string, null]
 *                           rank:
 *                             type: number
 *                             description: 搜索相关性排名分数
 *                     total:
 *                       type: integer
 *                       description: 总结果数
 *                     query:
 *                       type: string
 *                       description: 原始搜索词
 *                     tokensUsed:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: 实际使用的分词结果
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     pageSize:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNext:
 *                       type: boolean
 *                     hasPrev:
 *                       type: boolean
 *       400:
 *         description: 请求参数错误
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器错误
 */
export async function GET(request: Request) {
  await connection();
  const { searchParams } = new URL(request.url);

  const query = searchParams.get("query") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
  const searchIn =
    (searchParams.get("searchIn") as "title" | "content" | "both") || "both";
  const status = searchParams.get("status") as
    | "DRAFT"
    | "PUBLISHED"
    | "ARCHIVED"
    | null;

  const params = {
    query,
    page,
    pageSize,
    searchIn,
    ...(status && { status }),
  };

  // 验证参数
  const validation = SearchPostsSchema.safeParse(params);
  if (!validation.success) {
    return Response.json(
      {
        success: false,
        message: validation.error.issues[0]?.message || "参数验证失败",
      },
      { status: 400 },
    );
  }

  return searchPosts(validation.data, { environment: "serverless" });
}
