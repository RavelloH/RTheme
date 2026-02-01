import type { NextRequest } from "next/server";
import { connection } from "next/server";

import { createCategory } from "@/actions/category";

/**
 * @openapi
 * /api/admin/categories/create:
 *   post:
 *     summary: 创建分类
 *     description: 需管理员/编辑身份，创建新分类
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
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: 分类名称
 *               slug:
 *                 type: string
 *                 description: 分类slug（可选，不提供则自动生成）
 *               description:
 *                 type: [string, null]
 *                 description: 分类描述
 *               parentId:
 *                 type: [integer, null]
 *                 description: 父分类ID（null表示顶级分类）
 *               parentSlug:
 *                 type: string
 *                 description: 父分类slug（与parentId二选一）
 *     responses:
 *       200:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateCategorySuccessResponse'
 *       400:
 *         description: 请求参数错误或分类已存在
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

  return createCategory(
    {
      access_token,
      name: body.name,
      slug: body.slug,
      description: body.description,
      parentId: body.parentId,
      parentSlug: body.parentSlug,
    },
    { environment: "serverless" },
  );
}
