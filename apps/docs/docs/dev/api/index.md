---
sidebar_position: 2
tags:
  - dev
  - api
---

# 如何编写API

本文档将指导您如何在NeutralPress项目中编写API，实现完全自动化的API文档生成。

## 🚀 自动化流程概述

当您在dev模式下（`pnpm dev`）修改`apps/web/src/app/api`目录下的`route.ts`文件时，系统会：

1. **自动监控代码变化** - TypeScript编译器会实时监控您的代码修改
2. **自动生成OpenAPI规范** - 系统会扫描您的OpenAPI注释并生成JSON/YAML规范文件
3. **自动更新API文档** - 文档站点会自动重新生成并更新API文档页面

:::tip 提示
整个过程完全自动化，您只需要专注于编写API代码和OpenAPI注释！
:::

## 📝 API编写规范

### 1. 文件结构

```
apps/web/src/app/api/
├── posts/
│   └── route.ts          # 文章相关API
├── users/
│   └── route.ts          # 用户相关API
└── [其他资源]/
    └── route.ts
```

### 2. 基本API结构

每个`route.ts`文件应该包含：

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
// 导入相关的类型定义
import { PostsListResponseSchema } from "@repo/shared-types";

/**
 * @openapi
 * /api/posts:
 *   get:
 *     summary: 获取文章列表
 *     description: 分页获取文章列表，支持按发布状态筛选
 *     tags: [Posts]
 *     parameters:
 *       - name: page
 *         in: query
 *         description: 页码
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - name: limit
 *         in: query
 *         description: 每页数量
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - name: published
 *         in: query
 *         description: 是否只显示已发布文章
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 成功返回文章列表
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostsListResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid parameters"
 */
export async function GET(request: Request) {
  // API实现代码
}
```

### 3. OpenAPI注释详解

#### 基本信息

```typescript
/**
 * @openapi
 * /api/endpoint:           # API路径
 *   method:                # HTTP方法（get, post, put, delete等）
 *     summary: 简短描述     # API的简短描述
 *     description: 详细描述 # API的详细描述
 *     tags: [TagName]      # API分组标签
```

#### 请求参数

```typescript
*     parameters:
*       - name: paramName    # 参数名
*         in: query         # 参数位置: query, path, header, cookie
*         required: true    # 是否必需（可选）
*         description: 参数描述
*         schema:
*           type: string    # 参数类型: string, integer, boolean, array, object
*           minimum: 1     # 数值最小值（可选）
*           maximum: 100   # 数值最大值（可选）
*           default: 10    # 默认值（可选）
*           enum: [value1, value2]  # 枚举值（可选）
```

#### 请求体（用于POST/PUT）

```typescript
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             $ref: '#/components/schemas/CreatePostRequest'
*             # 或者直接定义：
*             type: object
*             properties:
*               title:
*                 type: string
*                 description: 文章标题
*               content:
*                 type: string
*                 description: 文章内容
```

#### 响应定义

```typescript
*     responses:
*       200:                    # HTTP状态码
*         description: 成功响应描述
*         content:
*           application/json:
*             schema:
*               $ref: '#/components/schemas/ResponseSchema'
*       400:
*         description: 错误响应描述
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 error:
*                   type: string
```

### 4. 完整示例

#### GET请求示例

```typescript
/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: 获取用户详情
 *     description: 根据用户ID获取用户的详细信息
 *     tags: [Users]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: 用户ID
 *         schema:
 *           type: string
 *       - name: includeProfile
 *         in: query
 *         description: 是否包含用户资料
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: 成功返回用户信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       404:
 *         description: 用户不存在
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  // 实现代码
}
```

#### POST请求示例

```typescript
/**
 * @openapi
 * /api/posts:
 *   post:
 *     summary: 创建新文章
 *     description: 创建一篇新的文章
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, authorId]
 *             properties:
 *               title:
 *                 type: string
 *                 description: 文章标题
 *                 minLength: 1
 *                 maxLength: 200
 *               content:
 *                 type: string
 *                 description: 文章内容
 *               authorId:
 *                 type: string
 *                 description: 作者ID
 *               published:
 *                 type: boolean
 *                 description: 是否发布
 *                 default: false
 *               tags:
 *                 type: array
 *                 description: 文章标签
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: 文章创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostResponse'
 *       400:
 *         description: 请求数据无效
 */
export async function POST(request: Request) {
  // 实现代码
}
```

## 🛠️ 开发工作流

### 1. 启动开发环境

```bash
pnpm dev
```

这会启动：

- Web服务（端口3000）
- 文档站点（端口3001）
- 代码监控和自动重新生成

### 2. 编写/修改API

1. 在`apps/web/src/app/api/`目录下创建或修改`route.ts`文件
2. 添加OpenAPI注释
3. 实现API逻辑

### 3. 查看生成的文档

- 访问 `http://localhost:3001/api` 查看自动生成的API文档
- 文档会在您保存文件后几秒内自动更新

### 4. 类型安全

利用`@repo/shared-types`包中的类型定义，确保API的类型安全：

```typescript
import {
  CreatePostRequestSchema,
  PostResponseSchema,
} from "@repo/shared-types";

// 使用Zod验证请求数据
const requestData = CreatePostRequestSchema.parse(await request.json());

// 确保响应符合类型定义
const response: z.infer<typeof PostResponseSchema> = {
  // 响应数据
};
```

## 📋 最佳实践

### 1. API设计原则

- 使用RESTful风格的URL命名
- 明确的HTTP状态码
- 一致的错误响应格式
- 详细的参数验证

### 2. 文档编写

- 提供清晰的summary和description
- 为所有参数添加描述
- 包含所有可能的响应状态码
- 使用实际的示例值

### 3. 错误处理

```typescript
// 统一的错误响应格式
const errorResponse = {
  error: "错误描述",
  code: "ERROR_CODE", // 可选的错误代码
  details: {}, // 可选的详细信息
};
```

### 4. 性能优化

- 使用适当的缓存策略
- 实现分页查询
- 添加请求限制和验证

## 🔧 故障排除

### 文档没有自动更新？

1. 检查turbo dev是否正常运行
2. 确认OpenAPI注释语法正确
3. 查看终端输出的错误信息

### API文档显示错误？

1. 验证OpenAPI注释格式
2. 检查schema引用是否正确
3. 确认类型定义是否存在

## 📚 相关资源

- [OpenAPI规范文档](https://swagger.io/specification/)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Zod类型验证](https://zod.dev/)

---

现在您已经掌握了在NeutralPress项目中编写API的完整流程！只需要修改`route.ts`文件，系统就会自动为您生成美观的API文档。
