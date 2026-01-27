import type { NextRequest } from "next/server";
import { updateUsers } from "@/actions/user";
import { connection } from "next/server";

/**
 * @openapi
 * /api/admin/users/update:
 *   post:
 *     summary: 批量更新用户信息
 *     description: |
 *       批量更新用户信息。只允许管理员操作。
 *       - 单个用户（uids.length === 1）：可以更改所有字段（除当前用户的角色和状态）
 *       - 批量更新（uids.length > 1）：只允许更改角色和状态，不允许包含当前用户
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
 *                 description: 要更新的用户 UID 数组
 *               role:
 *                 type: string
 *                 enum: [USER, ADMIN, EDITOR, AUTHOR]
 *                 description: 新的角色（批量更新或单个用户）
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, SUSPENDED, NEEDS_UPDATE]
 *                 description: 新的状态（批量更新或单个用户）
 *               username:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: 用户名（仅单个用户编辑）
 *               nickname:
 *                 type: string
 *                 maxLength: 100
 *                 description: 昵称（仅单个用户编辑）
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 邮箱地址（仅单个用户编辑）
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 description: 头像 URL（仅单个用户编辑）
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: 个人网站（仅单个用户编辑）
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 description: 个人简介（仅单个用户编辑）
 *               emailVerified:
 *                 type: boolean
 *                 description: 邮箱验证状态（仅单个用户编辑）
 *               emailNotice:
 *                 type: boolean
 *                 description: 是否接收邮件通知（仅单个用户编辑）
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
 *                       description: 成功更新的用户数量
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

  return updateUsers(
    {
      access_token,
      uids: body.uids,
      role: body.role,
      status: body.status,
      username: body.username,
      nickname: body.nickname,
      email: body.email,
      avatar: body.avatar,
      website: body.website,
      bio: body.bio,
      emailVerified: body.emailVerified,
      emailNotice: body.emailNotice,
    },
    { environment: "serverless" },
  );
}
