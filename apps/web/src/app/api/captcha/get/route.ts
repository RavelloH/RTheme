import { NextResponse } from "next/server";
import { createChallenge } from "@/actions/captcha";

/**
 * @openapi
 * /api/captcha/get:
 *   post:
 *     summary: 获取验证码挑战
 *     description: 获取一个新的验证码挑战，客户端需要解决这个挑战才能进行敏感操作
 *     tags:
 *       - Captcha
 *     responses:
 *       200:
 *         description: 成功返回验证码挑战数据
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
export async function POST() {
  try {
    const response = await createChallenge({
      environment: "serverless",
    });
    return response;
  } catch (error) {
    console.error("Get captcha error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "获取验证码失败，请稍后重试",
        timestamp: new Date().toISOString(),
        requestId: crypto.randomUUID(),
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "获取验证码失败，请稍后重试",
        },
      },
      { status: 500 },
    );
  }
}
