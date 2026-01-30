import type { NextRequest } from "next/server";
import { updateCategory } from "@/actions/category";
import { connection } from "next/server";

/**
 * @openapi
 * /api/admin/categories/update:
 *   put:
 *     summary: 更新分类
 *     description: 需管理员/编辑身份，更新分类信息，支持移动到新父分类
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 description: 分类ID（与slug二选一）
 *               slug:
 *                 type: string
 *                 description: 分类slug（与id二选一）
 *               newSlug:
 *                 type: string
 *                 description: 新的slug
 *               newName:
 *                 type: string
 *                 description: 新的名称
 *               description:
 *                 type: [string, null]
 *                 description: 描述
 *               parentId:
 *                 type: [integer, null]
 *                 description: 新的父分类ID（移动分类）
 *               parentSlug:
 *                 type: [string, null]
 *                 description: 新的父分类slug
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateCategorySuccessResponse'
 *       400:
 *         description: 请求参数错误或会造成循环引用
 *       401:
 *         description: 未授权
 *       404:
 *         description: 分类不存在
 *       500:
 *         description: 服务器错误
 */
export async function PUT(request: NextRequest) {
  await connection();
  const body = await request.json();
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return updateCategory(
    {
      access_token,
      id: body.id,
      slug: body.slug,
      newSlug: body.newSlug,
      newName: body.newName,
      description: body.description,
      parentId: body.parentId,
      parentSlug: body.parentSlug,
    },
    { environment: "serverless" },
  );
}
