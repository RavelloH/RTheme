import type { NextRequest } from "next/server";
import { deleteUsers } from "@/actions/user";
import { connection } from "next/server";

/**
 * @openapi
 * /api/admin/users/delete:
 *   post:
 *     summary: 批量删除用户
 *     description: 批量软删除用户。只允许管理员操作，不允许删除当前用户。
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uids
 *             properties:
 *               uids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 要删除的用户 UID 数组
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
 *                       description: 成功删除的用户数量
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

  return deleteUsers(
    {
      access_token,
      uids: body.uids,
    },
    { environment: "serverless" },
  );
}
