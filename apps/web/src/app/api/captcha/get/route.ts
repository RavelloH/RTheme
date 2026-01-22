import { createChallenge } from "@/actions/captcha";
import ResponseBuilder from "@/lib/server/response";
import { connection } from "next/server";
const response = new ResponseBuilder("serverless");

/**
 * @openapi
 * /api/captcha/get:
 *   get:
 *     summary: 获取验证码
 *     description: 获取一个新的验证码，客户端需要解决这个PoW才能进行敏感操作
 *     tags:
 *       - Captcha
 *     responses:
 *       200:
 *         description: 成功返回验证码数据
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CaptchaGetResponse'
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
export async function GET(): Promise<Response> {
  await connection();
  try {
    const response = await createChallenge({
      environment: "serverless",
    });
    return response as Response;
  } catch (error) {
    console.error("Get captcha error:", error);
    return response.badGateway() as Response;
  }
}
