import { NextRequest } from "next/server";
import { getPageDetail, updatePage } from "@/actions/page";

/**
 * @openapi
 * /api/admin/pages/{slug}:
 *   get:
 *     summary: 获取页面详情
 *     description: 需管理员身份，通过 slug 获取单个页面的详细信息
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: 页面的唯一标识符
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Pages
 *     responses:
 *       200:
 *         description: 返回页面详情
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPageDetailSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权访问此页面
 *       404:
 *         description: 页面不存在
 *       500:
 *         description: 服务器错误
 *   patch:
 *     summary: 更新页面
 *     description: 需管理员身份，通过 slug 更新单个页面
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: 页面的唯一标识符
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
 *                 description: 页面标题
 *               content:
 *                 type: string
 *                 description: 页面内容
 *               contentType:
 *                 type: string
 *                 enum: [MARKDOWN, HTML, MDX]
 *                 description: 内容类型
 *               excerpt:
 *                 type: string
 *                 description: 页面摘要
 *               config:
 *                 type: object
 *                 description: 页面配置（系统页面使用）
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED]
 *                 description: 页面状态
 *               metaTitle:
 *                 type: string
 *                 description: SEO 标题
 *               metaDescription:
 *                 type: string
 *                 description: SEO 描述
 *               metaKeywords:
 *                 type: string
 *                 description: SEO 关键词
 *               robotsIndex:
 *                 type: boolean
 *                 description: 是否允许搜索引擎索引
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Pages
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdatePageSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 无权修改此页面
 *       404:
 *         description: 页面不存在
 *       500:
 *         description: 服务器错误
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return getPageDetail(
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

    return updatePage(
      {
        access_token,
        slug,
        newSlug: body.newSlug,
        title: body.title,
        content: body.content,
        contentType: body.contentType,
        excerpt: body.excerpt,
        config: body.config,
        status: body.status,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        metaKeywords: body.metaKeywords,
        robotsIndex: body.robotsIndex,
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
