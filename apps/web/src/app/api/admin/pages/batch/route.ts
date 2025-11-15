import { NextRequest } from "next/server";
import { updatePages, deletePages } from "@/actions/page";

/**
 * @openapi
 * /api/admin/pages/batch:
 *   patch:
 *     summary: 批量更新页面
 *     description: 需管理员身份，批量更新页面
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePages'
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Pages
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdatePagesSuccessResponse'
 *   delete:
 *     summary: 批量删除页面
 *     description: 需管理员身份，批量删除页面（系统页面不会被删除）
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeletePages'
 *     security:
 *       - BearerAuth: []
 *     tags:
 *       - Pages
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeletePagesSuccessResponse'
 */

export async function PATCH(request: NextRequest) {
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  try {
    const body = await request.json();

    return updatePages({
      access_token,
      ids: body.ids,
      status: body.status,
      robotsIndex: body.robotsIndex,
    });
  } catch (error) {
    console.error("Parse request body error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "无效的请求数据",
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const access_token = request.headers
    .get("authorization")
    ?.replace("Bearer ", "");

  try {
    const body = await request.json();

    return deletePages({
      access_token,
      ids: body.ids,
    });
  } catch (error) {
    console.error("Parse request body error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "无效的请求数据",
        },
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
