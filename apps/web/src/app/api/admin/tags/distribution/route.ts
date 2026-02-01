import { GetTagsDistributionSchema } from "@repo/shared-types/api/tag";
import { connection } from "next/server";

import { getTagsDistribution } from "@/actions/tag";
import { validateGetRequest } from "@/lib/server/request-converter";
import ResponseBuilder from "@/lib/server/response";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/tags/distribution:
 *   get:
 *     summary: 获取标签分布数据
 *     description: 需管理员/编辑身份，获取标签使用分布，用于环形图展示
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 返回前N个标签
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Tags
 *     responses:
 *       200:
 *         description: 返回标签分布数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetTagsDistributionSuccessResponse'
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
      GetTagsDistributionSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    return (await getTagsDistribution(validationResult.data, {
      environment: "serverless",
    })) as Response;
  } catch (error) {
    console.error("Get Tags Distribution route error:", error);
    return response.badGateway() as Response;
  }
}
