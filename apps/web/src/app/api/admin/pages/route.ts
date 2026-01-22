import { connection, NextRequest } from "next/server";
import { getPagesList, createPage } from "@/actions/page";

/**
 * @openapi
 * /api/admin/pages:
 *   get:
 *     summary: 获取页面列表
 *     description: 需管理员身份，获取页面列表
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
 *           enum: [id, title, slug, createdAt, updatedAt]
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
 *           enum: [ACTIVE, SUSPENDED]
 *         description: 页面状态
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Pages
 *     responses:
 *       200:
 *         description: 返回页面列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPagesListSuccessResponse'
 *   post:
 *     summary: 新建页面
 *     description: 需管理员身份，创建新页面
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePage'
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Pages
 *     responses:
 *       200:
 *         description: 返回创建的页面信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePageSuccessResponse'
 */
export async function GET(request: NextRequest) {
  await connection();
  const url = new URL(request.url);
  const page = url.searchParams.get("page");
  const pageSize = url.searchParams.get("pageSize");
  const sortBy = url.searchParams.get("sortBy");
  const sortOrder = url.searchParams.get("sortOrder");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");
  const isSystemPage = url.searchParams.get("isSystemPage");
  const robotsIndex = url.searchParams.get("robotsIndex");
  const createdAtStart = url.searchParams.get("createdAtStart");
  const createdAtEnd = url.searchParams.get("createdAtEnd");
  const updatedAtStart = url.searchParams.get("updatedAtStart");
  const updatedAtEnd = url.searchParams.get("updatedAtEnd");
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return getPagesList(
    {
      access_token,
      page: page ? parseInt(page) : 1,
      pageSize: pageSize ? parseInt(pageSize) : 25,
      sortBy:
        (sortBy as "id" | "title" | "slug" | "createdAt" | "updatedAt") || "id",
      sortOrder: (sortOrder as "asc" | "desc") || "desc",
      status: status ? ([status] as ("ACTIVE" | "SUSPENDED")[]) : undefined,
      search: search || undefined,
      isSystemPage: isSystemPage
        ? ([isSystemPage].map((v) => v === "true") as boolean[])
        : undefined,
      robotsIndex: robotsIndex
        ? ([robotsIndex].map((v) => v === "true") as boolean[])
        : undefined,
      createdAtStart: createdAtStart || undefined,
      createdAtEnd: createdAtEnd || undefined,
      updatedAtStart: updatedAtStart || undefined,
      updatedAtEnd: updatedAtEnd || undefined,
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

    return createPage(
      {
        access_token,
        title: body.title,
        slug: body.slug,
        content: body.content,
        contentType: body.contentType,
        config: body.config,
        status: body.status,
        metaDescription: body.metaDescription,
        metaKeywords: body.metaKeywords,
        robotsIndex: body.robotsIndex,
        isSystemPage: body.isSystemPage,
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
