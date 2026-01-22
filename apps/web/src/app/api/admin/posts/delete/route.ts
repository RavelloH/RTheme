import { NextRequest } from "next/server";
import { deletePosts } from "@/actions/post";
import { connection } from "next/server";

/**
 * @openapi
 * /api/admin/posts/delete:
 *   post:
 *     summary: 批量删除文章
 *     description: 需管理员/编辑/作者身份，批量删除文章
 *     tags: [Posts]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 要删除的文章 ID 数组
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: integer
 *                       description: 成功删除的文章数量
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
export async function POST(request: NextRequest) {
  await connection();
  const body = await request.json();
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return deletePosts(
    {
      access_token,
      ids: body.ids,
    },
    { environment: "serverless" },
  );
}
