import { UpdateSettingsSchema } from "@repo/shared-types/api/setting";
import { connection } from "next/server";

import { updateSettings } from "@/actions/setting";
import ResponseBuilder from "@/lib/server/response";
import { validateJSON } from "@/lib/server/validator";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/admin/settings/set:
 *   post:
 *     summary: 批量更新配置项
 *     description: 需管理员身份，批量更新系统配置项
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Settings
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - settings
 *             properties:
 *               access_token:
 *                 type: string
 *                 description: 访问令牌（也可以通过 Authorization header 传递）
 *               settings:
 *                 type: array
 *                 description: 要更新的配置项列表
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - key
 *                     - value
 *                   properties:
 *                     key:
 *                       type: string
 *                       description: 配置项键名
 *                       minLength: 1
 *                     value:
 *                       description: 配置项值（支持任意 JSON 类型）
 *           example:
 *             settings:
 *               - key: "site.title"
 *                 value: "我的网站"
 *               - key: "site.description"
 *                 value: "欢迎来到我的网站"
 *               - key: "features.comments"
 *                 value: true
 *     responses:
 *       200:
 *         description: 成功更新配置项
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateSettingsSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BadRequestErrorResponse'
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
  await connection();
  try {
    // 使用 validateJSON 自动解析 JSON 并验证数据
    const validationResult = await validateJSON(request, UpdateSettingsSchema);
    if (validationResult instanceof Response) return validationResult;

    const { access_token, settings } = validationResult.data;

    // 如果 body 中没有 access_token，尝试从 Authorization header 中提取
    const finalAccessToken =
      access_token ||
      (request.headers.get("Authorization")?.startsWith("Bearer ")
        ? request.headers.get("Authorization")!.substring(7)
        : undefined);

    return (await updateSettings(
      { access_token: finalAccessToken, settings },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Update settings route error:", error);
    return response.badGateway() as Response;
  }
}
