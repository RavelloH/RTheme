import type { NextRequest } from "next/server";
import { moveCategories } from "@/actions/category";
import { connection } from "next/server";

/**
 * @openapi
 * /api/admin/categories/move:
 *   put:
 *     summary: 批量移动分类
 *     description: 需管理员/编辑身份，将多个分类移动到同一个父分类下
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
 *               - targetParentId
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: 要移动的分类ID数组
 *                 minItems: 1
 *               targetParentId:
 *                 type: [integer, null]
 *                 description: 目标父分类ID（null表示移动到顶级）
 *               targetParentSlug:
 *                 type: [string, null]
 *                 description: 目标父分类slug（与targetParentId二选一）
 *     responses:
 *       200:
 *         description: 移动成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MoveCategoriesSuccessResponse'
 *       400:
 *         description: 请求参数错误或会造成循环引用
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
export async function PUT(request: NextRequest) {
  await connection();
  const body = await request.json();
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return moveCategories(
    {
      access_token,
      ids: body.ids,
      targetParentId: body.targetParentId,
      targetParentSlug: body.targetParentSlug,
    },
    { environment: "serverless" },
  );
}
