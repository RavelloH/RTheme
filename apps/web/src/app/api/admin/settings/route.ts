import { getSettings } from "@/actions/setting";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetSettingsSchema } from "@repo/shared-types/api/setting";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/settings:
 *   get:
 *     summary: 获取所有配置项
 *     description: 需管理员身份，获取系统所有配置项
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Settings
 *     responses:
 *       200:
 *         description: 返回所有配置项
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetSettingsSuccessResponse'
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
  try {
    // 使用 validateGetRequest 自动从查询参数和 Authorization header 中提取并验证数据
    const validationResult = validateGetRequest(request, GetSettingsSchema);
    if (validationResult instanceof Response) return validationResult;

    const { access_token } = validationResult.data;

    return (await getSettings(
      { access_token },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Get settings route error:", error);
    return response.badGateway() as Response;
  }
}
