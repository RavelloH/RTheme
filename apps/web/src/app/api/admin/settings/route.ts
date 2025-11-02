import { getSettings, updateSettings } from "@/actions/setting";
import ResponseBuilder from "@/lib/server/response";
import { validateGetRequest } from "@/lib/server/request-converter";
import { GetSettingsSchema } from "@repo/shared-types/api/setting";
import { NextRequest } from "next/server";

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

/**
 * @openapi
 * /api/admin/settings:
 *   patch:
 *     summary: 批量更新配置项
 *     description: |
 *       批量更新系统配置项。只允许管理员操作。
 *       支持一次更新多个配置项，如果配置项不存在会自动创建。
 *     tags:
 *       - Settings
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settings
 *             properties:
 *               settings:
 *                 type: array
 *                 minItems: 1
 *                 description: 要更新的配置项数组
 *                 items:
 *                   type: object
 *                   required:
 *                     - key
 *                     - value
 *                   properties:
 *                     key:
 *                       type: string
 *                       minLength: 1
 *                       description: 配置项键名
 *                       example: "site.title"
 *                     value:
 *                       description: 配置项值，可以是任意 JSON 类型
 *                       example: {"default": "NeutralPress"}
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateSettingsSuccessResponse'
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
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return updateSettings(
    {
      access_token,
      settings: body.settings,
    },
    { environment: "serverless" },
  );
}
