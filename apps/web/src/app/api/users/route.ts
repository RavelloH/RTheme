import { NextResponse } from "next/server";
import { UsersListResponseSchema, PaginationSchema } from "@repo/shared-types";
import { z } from "zod";

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: 获取用户列表
 *     tags: [Users]
 *     parameters:
 *       - name: page
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: sortBy
 *         in: query
 *         schema:
 *           type: string
 *       - name: sortOrder
 *         in: query
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: 成功返回用户列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UsersListResponse'
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 验证查询参数
    const pagination = PaginationSchema.parse({
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!) : 1,
      limit: searchParams.get("limit")
        ? parseInt(searchParams.get("limit")!)
        : 10,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    });

    // 模拟数据（在实际应用中会从数据库获取）
    const mockUsers = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@neutralpress.com",
        name: "管理员",
        role: "ADMIN" as const,
        avatar: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        email: "editor@neutralpress.com",
        name: "编辑者",
        role: "EDITOR" as const,
        avatar: null,
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
      },
    ];

    const response = {
      users: mockUsers.slice(
        (pagination.page - 1) * pagination.limit,
        pagination.page * pagination.limit,
      ),
      total: mockUsers.length,
      page: pagination.page,
      limit: pagination.limit,
    };

    // 使用 Zod 验证响应数据
    const validatedResponse = UsersListResponseSchema.parse(response);

    return NextResponse.json(validatedResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "请求参数验证失败",
          error: error.message,
          statusCode: 400,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "服务器内部错误",
        statusCode: 500,
      },
      { status: 500 },
    );
  }
}
