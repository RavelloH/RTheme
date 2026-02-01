import type { NextRequest } from "next/server";
import { connection } from "next/server";

import { createTag } from "@/actions/tag";

/**
 * @openapi
 * /api/admin/tags/create:
 *   post:
 *     summary: 创建标签
 *     description: 需管理员/编辑身份，创建新标签
 *     tags: [Tags]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 标签名称
 *               description:
 *                 type: [string, null]
 *                 description: 标签描述
 *     responses:
 *       200:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateTagSuccessResponse'
 *       400:
 *         description: 请求参数错误或标签已存在
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

  return createTag(
    {
      access_token,
      name: body.name,
      description: body.description,
    },
    { environment: "serverless" },
  );
}
