import { GetCategoriesListSchema } from "@repo/shared-types/api/category";
import { connection } from "next/server";

import { getCategoriesList } from "@/actions/category";
import { validateGetRequest } from "@/lib/server/request-converter";
import ResponseBuilder from "@/lib/server/response";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/categories/list:
 *   get:
 *     summary: 获取分类列表
 *     description: 需管理员/编辑身份，获取分类列表，支持分页、搜索、排序和筛选
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: 每页数量
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [slug, name, directPostCount, totalPostCount, directChildCount, totalChildCount, createdAt, updatedAt]
 *         description: 排序字段
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: 排序方向
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: [integer, null]
 *         description: 父分类ID（null表示顶级分类）
 *       - in: query
 *         name: parentSlug
 *         schema:
 *           type: string
 *         description: 父分类slug
 *       - in: query
 *         name: hasZeroPosts
 *         schema:
 *           type: boolean
 *         description: 筛选无文章关联的分类
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: 返回分类列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCategoriesListSuccessResponse'
 *       401:
 *         description: 未授权
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedErrorResponse'
 */
export async function GET(request: Request): Promise<Response> {
  await connection();
  try {
    const validationResult = await validateGetRequest(
      request,
      GetCategoriesListSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    return (await getCategoriesList(validationResult.data, {
      environment: "serverless",
    })) as Response;
  } catch (error) {
    console.error("Get Categories List route error:", error);
    return response.badGateway() as Response;
  }
}
