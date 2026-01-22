import { NextRequest } from "next/server";
import { updateTag } from "@/actions/tag";
import { connection } from "next/server";

/**
 * @openapi
 * /api/admin/tags/update:
 *   post:
 *     summary: 更新标签
 *     description: 需管理员/编辑身份，更新标签信息
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
 *               - slug
 *             properties:
 *               slug:
 *                 type: string
 *                 description: 当前标签 slug
 *               newSlug:
 *                 type: string
 *                 description: 新标签 slug（可选）
 *               newName:
 *                 type: string
 *                 description: 新标签名称（可选）
 *               description:
 *                 type: string
 *                 nullable: true
 *                 description: 标签描述
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateTagSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       404:
 *         description: 标签不存在
 *       500:
 *         description: 服务器错误
 */
export async function POST(request: NextRequest) {
  await connection();
  const body = await request.json();
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return updateTag(
    {
      access_token,
      slug: body.slug,
      newSlug: body.newSlug,
      newName: body.newName,
      description: body.description,
    },
    { environment: "serverless" },
  );
}
