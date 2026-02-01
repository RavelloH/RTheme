import type { NextRequest } from "next/server";
import { connection } from "next/server";

import { getPostDetail, updatePost } from "@/actions/post";

/**
 * @openapi
 * /api/admin/posts/{slug}:
 *   get:
 *     summary: 获取文章详情
 *     description: 需管理员/编辑/作者身份，通过 slug 获取单个文章的详细信息
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: 文章的唯一标识符
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Posts
 *     responses:
 *       200:
 *         description: 返回文章详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPostDetailSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权访问此文章
 *       404:
 *         description: 文章不存在
 *       500:
 *         description: 服务器错误
 *   patch:
 *     summary: 更新文章
 *     description: 需管理员/编辑/作者身份，通过 slug 更新单个文章
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: 文章的唯一标识符
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newSlug:
 *                 type: string
 *                 description: 新的 slug（如果需要修改）
 *               title:
 *                 type: string
 *                 description: 文章标题
 *               content:
 *                 type: string
 *                 description: 文章内容
 *               excerpt:
 *                 type: string
 *                 description: 文章摘要
 *               featuredImage:
 *                 type: string
 *                 description: 特色图片 URL
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
 *                 description: 文章状态
 *               isPinned:
 *                 type: boolean
 *                 description: 是否置顶
 *               allowComments:
 *                 type: boolean
 *                 description: 是否允许评论
 *               publishedAt:
 *                 type: string
 *                 format: date-time
 *                 description: 发布时间
 *               metaDescription:
 *                 type: string
 *                 description: SEO 描述
 *               metaKeywords:
 *                 type: string
 *                 description: SEO 关键词
 *               robotsIndex:
 *                 type: boolean
 *                 description: 是否允许搜索引擎索引
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 文章分类
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 文章标签
 *               commitMessage:
 *                 type: string
 *                 description: 版本提交信息
 *               postMode:
 *                 type: string
 *                 enum: [MARKDOWN, MDX]
 *                 description: 文章编辑器模式
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Posts
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdatePostSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权修改此文章
 *       404:
 *         description: 文章不存在
 *       500:
 *         description: 服务器错误
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  await connection();
  const { slug } = await params;
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return getPostDetail(
    {
      access_token,
      slug,
    },
    { environment: "serverless" },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  try {
    const body = await request.json();

    return updatePost(
      {
        access_token,
        slug,
        newSlug: body.newSlug,
        title: body.title,
        content: body.content,
        excerpt: body.excerpt,
        featuredImage: body.featuredImage,
        status: body.status,
        isPinned: body.isPinned,
        allowComments: body.allowComments,
        publishedAt: body.publishedAt,
        metaDescription: body.metaDescription,
        metaKeywords: body.metaKeywords,
        robotsIndex: body.robotsIndex,
        categories: body.categories,
        tags: body.tags,
        commitMessage: body.commitMessage,
        postMode: body.postMode,
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
