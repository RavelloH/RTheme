import { NextResponse } from "next/server";
import { PostsListResponseSchema, PaginationSchema } from "@repo/shared-types";
import { z } from "zod";

/**
 * @openapi
 * /api/posts:
 *   get:
 *     summary: 获取文章列表
 *     description: 分页获取文章列表，支持按发布状态筛选
 *     tags: [Posts]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: published
 *         in: query
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 成功返回文章列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostsListResponse'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 验证查询参数
    const pagination = PaginationSchema.parse({
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 10,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    });

    const published = searchParams.get("published");
    const publishedFilter =
      published !== null ? published === "true" : undefined;

    // 模拟数据（在实际应用中会从数据库获取）
    const mockPosts = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        title: "NeutralPress 入门指南",
        slug: "neutralpress-getting-started",
        content: "这是 NeutralPress 的入门指南...",
        excerpt: "快速上手 NeutralPress CMS 系统",
        published: true,
        authorId: "00000000-0000-0000-0000-000000000001",
        categoryId: "00000000-0000-0000-0000-000000000001",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        title: "API 开发最佳实践",
        slug: "api-development-best-practices",
        content: "本文介绍 API 开发的最佳实践...",
        excerpt: "学习如何开发高质量的 API",
        published: false,
        authorId: "00000000-0000-0000-0000-000000000001",
        categoryId: "00000000-0000-0000-0000-000000000002",
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
      },
    ];

    // 根据发布状态过滤
    const filteredPosts =
      publishedFilter !== undefined
        ? mockPosts.filter((post) => post.published === publishedFilter)
        : mockPosts;

    const response = {
      posts: filteredPosts.slice(
        (pagination.page - 1) * pagination.limit,
        pagination.page * pagination.limit,
      ),
      total: filteredPosts.length,
      page: pagination.page,
      limit: pagination.limit,
    };

    // 使用 Zod 验证响应数据
    const validatedResponse = PostsListResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "请求参数验证失败",
          error: error.message,
          statusCode: 400,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "服务器内部错误",
        statusCode: 500,
      },
      { status: 500 },
    );
  }
}
