import { getTagsList } from "@/actions/tag";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetTagsListSchema } from "@repo/shared-types/api/tag";
import { connection } from "next/server";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/tags/list:
 *   get:
 *     summary: 获取标签列表
 *     description: 需管理员/编辑身份，获取标签列表，支持分页、搜索、排序和筛选
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
 *           enum: [name, postCount, createdAt, updatedAt]
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
 *         name: hasZeroPosts
 *         schema:
 *           type: boolean
 *         description: 筛选无文章关联的标签
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Tags
 *     responses:
 *       200:
 *         description: 返回标签列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetTagsListSuccessResponse'
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
      GetTagsListSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    return (await getTagsList(validationResult.data, {
      environment: "serverless",
    })) as Response;
  } catch (error) {
    console.error("Get Tags List route error:", error);
    return response.badGateway() as Response;
  }
}
