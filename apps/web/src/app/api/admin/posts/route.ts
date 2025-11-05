import { NextRequest } from "next/server";
import { getPostsList } from "@/actions/post";

/**
 * @openapi
 * /api/admin/posts:
 *   get:
 *     summary: 获取文章列表
 *     description: 需管理员/编辑/作者身份，获取文章列表
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [id, title, publishedAt, updatedAt, createdAt]
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: 排序方向
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISHED, ARCHIVED]
 *         description: 文章状态
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Posts
 *     responses:
 *       200:
 *         description: 返回文章列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostsListSuccessResponse'
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const page = url.searchParams.get("page");
  const pageSize = url.searchParams.get("pageSize");
  const sortBy = url.searchParams.get("sortBy");
  const sortOrder = url.searchParams.get("sortOrder");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return getPostsList(
    {
      access_token,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 25,
      sortBy:
        (sortBy as
          | "id"
          | "title"
          | "publishedAt"
          | "updatedAt"
          | "createdAt") || "id",
      sortOrder: (sortOrder as "asc" | "desc") || "desc",
      status: status as "DRAFT" | "PUBLISHED" | "ARCHIVED" | undefined,
      search: search || undefined,
    },
    { environment: "serverless" },
  );
}
