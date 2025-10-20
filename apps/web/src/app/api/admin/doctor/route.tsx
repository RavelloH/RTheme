import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { DoctorSchema } from "@repo/shared-types/api/admin";
import { doctor } from "@/actions/admin";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/doctor:
 *   post:
 *     summary: 运行自检
 *     description: 自我检查系统的健康状态。带有force参数时，忽略最近24小时内的缓存结果，强制重新运行自检。
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Doctor'
 *     responses:
 *       200:
 *         description: 自检完成
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DcotorSuccessResponse'
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
export async function POST(request: Request): Promise<Response> {
  try {
    // 验证请求数据
    const validationResult = await validateRequestJSON(request, DoctorSchema);
    if (validationResult instanceof Response) return validationResult;

    const { access_token, force } = validationResult.data!;

    return (await doctor(
      {
        access_token,
        force,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Doctor route error:", error);
    return response.badGateway() as Response;
  }
}
