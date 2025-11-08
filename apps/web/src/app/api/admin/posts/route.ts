import { NextRequest } from "next/server";
import { getPostsList, createPost } from "@/actions/post";

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
 *   post:
 *     summary: 新建文章
 *     description: 需管理员/编辑/作者身份，创建新文章
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePost'
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Posts
 *     responses:
 *       200:
 *         description: 返回创建的文章信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePostSuccessResponse'
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

export async function POST(request: NextRequest) {
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  try {
    const body = await request.json();

    return createPost(
      {
        access_token,
        title: body.title,
        slug: body.slug,
        content: body.content,
        excerpt: body.excerpt,
        featuredImage: body.featuredImage,
        status: body.status,
        isPinned: body.isPinned,
        allowComments: body.allowComments,
        publishedAt: body.publishedAt,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        metaKeywords: body.metaKeywords,
        robotsIndex: body.robotsIndex,
        categories: body.categories,
        tags: body.tags,
        commitMessage: body.commitMessage,
      },
      { environment: "serverless" },
    );
  } catch (error) {
    console.error("Parse request body error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "无效的请求数据",
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
