import type { NextRequest } from "next/server";
import { connection } from "next/server";
import { deleteCategories } from "@/actions/category";

/**
 * @openapi
 * /api/admin/categories/delete:
 *   delete:
 *     summary: 批量删除分类
 *     description: 需管理员身份，批量删除分类（级联删除所有子孙分类）
 *     tags: [Categories]
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
 *                 description: 要删除的分类ID数组
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteCategoriesSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
export async function DELETE(request: NextRequest) {
  await connection();
  const body = await request.json();
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return deleteCategories(
    {
      access_token,
      ids: body.ids,
    },
    { environment: "serverless" },
  );
}
