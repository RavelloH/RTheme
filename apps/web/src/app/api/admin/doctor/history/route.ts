import { getDoctorHistory } from "@/actions/doctor";
import ResponseBuilder from "@/lib/server/response";
import { connection } from "next/server";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetDoctorHistorySchema } from "@repo/shared-types/api/doctor";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/doctor/history:
 *   get:
 *     summary: 获取自检历史记录
 *     description: 需管理员身份，分页获取系统自检历史记录
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 每页数量
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Admin
 *     responses:
 *       200:
 *         description: 返回自检历史记录
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetDoctorHistorySuccessResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: 未授权，Access Token 无效或不存在，权限不足
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedErrorResponse'
 *       429:
 *         description: 请求过于频繁
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RateLimitErrorResponse'
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerErrorResponse'
 */
export async function GET(request: Request): Promise<Response> {
  await connection();
  try {
    // 使用 validateGetRequest 自动从查询参数和 Authorization header 中提取并验证数据
    const validationResult = await validateGetRequest(
      request,
      GetDoctorHistorySchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { access_token, page, pageSize } = validationResult.data;

    return (await getDoctorHistory(
      {
        access_token,
        page,
        pageSize,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get Doctor History route error:", error);
    return response.badGateway() as Response;
  }
}
