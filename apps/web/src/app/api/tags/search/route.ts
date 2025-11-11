import { searchTags } from "@/actions/tag";
import { SearchTagsSchema } from "@repo/shared-types/api/tag";

/**
 * @openapi
 * /api/tags/search:
 *   get:
 *     summary: 搜索标签
 *     description: 轻量级标签搜索接口，用于自动补全。支持按名称和 slug 模糊搜索。
 *     tags: [Tags]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 返回结果数量限制
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       slug:
 *                         type: string
 *                         example: minecraft
 *                       name:
 *                         type: string
 *                         example: Minecraft
 *                       postCount:
 *                         type: integer
 *                         example: 5
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       429:
 *         description: 请求过于频繁
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  // 从 Authorization header 获取 token
  const authHeader = request.headers.get("authorization");
  const access_token = authHeader?.replace("Bearer ", "");

  const params = {
    access_token,
    query,
    limit,
  };

  // 验证参数
  const validation = SearchTagsSchema.safeParse(params);
  if (!validation.success) {
    return Response.json(
      {
        success: false,
        message: validation.error.issues[0]?.message || "参数验证失败",
      },
      { status: 400 },
    );
  }

  return searchTags(params, { environment: "serverless" });
}
