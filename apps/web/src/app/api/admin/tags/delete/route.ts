import { NextRequest } from "next/server";
import { deleteTags } from "@/actions/tag";
import { connection } from "next/server";

/**
 * @openapi
 * /api/admin/tags/delete:
 *   post:
 *     summary: 批量删除标签
 *     description: 需管理员身份，批量删除标签
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
 *               - slugs
 *             properties:
 *               slugs:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: 要删除的标签 slug 数组
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteTagsSuccessResponse'
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

  return deleteTags(
    {
      access_token,
      slugs: body.slugs,
    },
    { environment: "serverless" },
  );
}
