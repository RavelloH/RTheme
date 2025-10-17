import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { RegisterUserSchema } from "@repo/shared-types/api/auth";
import { register } from "@/actions/auth";

const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: 用户注册
 *     description: 注册新用户
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUser'
 *     responses:
 *       200:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RegisterSuccessResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       409:
 *         description: 用户名或邮箱已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictErrorResponse'
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
    const validationResult = await validateRequestJSON(
      request,
      RegisterUserSchema,
    );
    if (validationResult instanceof Response) return validationResult;

    const { username, email, password, nickname, captcha_token } =
      validationResult.data!;

    return (await register(
      {
        username,
        email,
        password,
        nickname,
        captcha_token,
      },
      {
        environment: "serverless",
      },
    )) as Response;
  } catch (error) {
    console.error("Register route error:", error);
    return response.badGateway() as Response;
  }
}
