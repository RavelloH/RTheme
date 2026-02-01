import type { NextRequest } from "next/server";
import { connection } from "next/server";

import { updatePosts } from "@/actions/post";

/**
 * @openapi
 * /api/admin/posts/update:
 *   post:
 *     summary: 批量更新文章
 *     description: 需管理员/编辑/作者身份，批量更新文章信息
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
 *                 description: 要更新的文章 ID 数组
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISHED, ARCHIVED]
 *                 description: 新的状态
 *               isPinned:
 *                 type: boolean
 *                 description: 是否置顶
 *               allowComments:
 *                 type: boolean
 *                 description: 是否允许评论
 *     responses:
 *       200:
 *         description: 更新成功
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
 *                     updated:
 *                       type: integer
 *                       description: 成功更新的文章数量
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

  return updatePosts(
    {
      access_token,
      ids: body.ids,
      status: body.status,
      isPinned: body.isPinned,
      allowComments: body.allowComments,
    },
    { environment: "serverless" },
  );
}
