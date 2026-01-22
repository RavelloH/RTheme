import { getCategoriesDistribution } from "@/actions/category";
import ResponseBuilder from "@/lib/server/response";
import { connection } from "next/server";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetCategoriesDistributionSchema } from "@repo/shared-types/api/category";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/categories/distribution:
 *   get:
 *     summary: 获取分类分布统计
 *     description: 需管理员/编辑/作者身份，获取当前层级分类的文章分布情况（含子孙分类），用于环形图展示
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: integer
 *           nullable: true
 *         description: 父分类ID（null表示顶级分类）
 *       - in: query
 *         name: parentSlug
 *         schema:
 *           type: string
 *         description: 父分类slug
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 返回数量限制（默认10）
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Categories
 *     responses:
 *       200:
 *         description: 返回分类分布数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetCategoriesDistributionSuccessResponse'
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
      GetCategoriesDistributionSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    return (await getCategoriesDistribution(validationResult.data, {
      environment: "serverless",
    })) as Response;
  } catch (error) {
    console.error("Get Categories Distribution route error:", error);
    return response.badGateway() as Response;
  }
}
