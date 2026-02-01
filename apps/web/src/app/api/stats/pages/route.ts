import type { NextRequest } from "next/server";
import { connection } from "next/server";

import { getPagesStats } from "@/actions/stat";

/**
 * @openapi
 * /api/stats/pages:
 *   get:
 *     summary: 获取页面统计信息
 *     description: 需管理员身份，获取页面统计数据
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *           default: false
 *         description: 是否强制刷新缓存
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Pages
 *     responses:
 *       200:
 *         description: 返回页面统计信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GetPagesStatsSuccessResponse'
 */
export async function GET(request: NextRequest) {
  await connection();
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  return getPagesStats(
    {
      access_token,
      force,
    },
    { environment: "serverless" },
  );
}
