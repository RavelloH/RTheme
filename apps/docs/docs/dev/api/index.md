---
sidebar_position: 2
tags:
  - dev
  - api
---

# 如何编写API

本文档将指导您如何在NeutralPress项目中编写类型安全的API，使用Zod进行数据验证和自动生成OpenAPI文档。

## 🚀 现代化开发流程

NeutralPress采用基于Zod + 简化OpenAPI注释的现代化API开发方式：

1. **定义Zod Schema** - 在 `packages/shared-types` 中定义数据结构
2. **添加简化注释** - 只需指定路径、方法和Schema引用
3. **使用验证工具** - 通过 `validateRequestJSON` 自动验证和错误处理
4. **类型安全开发** - 获得完整的TypeScript类型推导
5. **自动文档生成** - 从Zod Schema和注释生成完整OpenAPI文档

:::tip 优势
- 大幅简化OpenAPI注释编写
- 类型安全且运行时验证
- 统一的错误处理格式
- 自动同步的前后端类型
:::

## 📝 API开发步骤

### 1. 定义数据Schema

在 `packages/shared-types/src/api/` 中定义API的输入输出类型：

```typescript
// packages/shared-types/src/api/auth.ts
import { z } from "zod";

export const RegisterUserSchema = z.object({
  username: z.string()
    .min(3, "用户名至少需要3个字符")
    .max(20, "用户名不能超过20个字符")
    .regex(/^[a-z0-9_]+$/, "用户名只能由小写字母、数字和下划线组成"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string()
    .min(6, "密码至少需要6个字符")
    .max(100, "密码不能超过100个字符"),
  nickname: z.string()
    .min(2, "昵称至少需要2个字符")
    .max(20, "昵称不能超过20个字符")
    .optional()
});

export type RegisterUser = z.infer<typeof RegisterUserSchema>;
```

### 2. 添加简化的OpenAPI注释

为API添加基本的OpenAPI注释，引用定义好的Schema：

```typescript
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
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       409:
 *         description: 用户名或邮箱已存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
```

### 3. 实现API路由

在 `apps/web/src/app/api/` 中创建路由文件：

```typescript
// apps/web/src/app/api/auth/register/route.ts
import response from "@/app/api/_utils/response";
import { validateRequestJSON } from "@/app/api/_utils/validator";
import { RegisterUserSchema } from "@repo/shared-types/api/auth";
import prisma from "@/app/lib/prisma";
import limitControl from "../../_utils/limit";

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
 *       201:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 用户名或邮箱已存在
 *       429:
 *         description: 请求过于频繁
 */
export async function POST(request: Request) {
  try {
    // 速率限制
    if (!(await limitControl(request))) {
      return response.tooManyRequests();
    }

    // 数据验证（自动类型推导）
    const validation = await validateRequestJSON(request, RegisterUserSchema);
    if (validation instanceof Response) return validation;
    
    const { username, email, password, nickname } = validation.data!;

    // 业务逻辑
    const userExists = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] }
    });

    if (userExists) {
      return response.conflict({
        message: "用户名或邮箱已存在",
        error: {
          code: "USER_EXISTS",
          message: "用户名或邮箱已存在"
        }
      });
    }

    // 创建用户
    const user = await prisma.user.create({
      data: { username, email, password, nickname }
    });

    return response.created({
      message: "注册成功",
      data: { userId: user.id }
    });

  } catch (error) {
    return response.serverError({
      message: "注册失败，请稍后重试"
    });
  }
}
```

### 4. 文件结构

```
packages/shared-types/src/api/
├── auth.ts              # 认证相关Schema
├── posts.ts             # 文章相关Schema
├── users.ts             # 用户相关Schema
└── common.ts            # 通用Schema

apps/web/src/app/api/
├── auth/
│   ├── register/
│   │   └── route.ts     # POST /api/auth/register
│   └── login/
│       └── route.ts     # POST /api/auth/login
├── posts/
│   ├── route.ts         # GET,POST /api/posts
│   └── [id]/
│       └── route.ts     # GET,PUT,DELETE /api/posts/[id]
└── users/
    └── route.ts         # GET /api/users
```

## 🔧 核心工具使用

### 数据验证

```typescript
import { validateRequestJSON } from "@/app/api/_utils/validator";

// 自动验证并返回错误响应
const validation = await validateRequestJSON(request, MySchema);
if (validation instanceof Response) return validation;

// 获得类型安全的数据
const data = validation.data!; // 完整TypeScript类型推导
```

### 统一响应

```typescript
import response from "@/app/api/_utils/response";

// 成功响应
return response.ok({ data: users, message: "获取成功" });
return response.created({ data: newUser, message: "创建成功" });

// 错误响应
return response.badRequest({ message: "请求参数错误" });
return response.notFound({ message: "用户不存在" });
return response.conflict({ message: "用户已存在" });
```

### 速率限制

```typescript
import limitControl from "@/app/api/_utils/limit";

// 自动IP限频
if (!(await limitControl(request))) {
  return response.tooManyRequests();
}
```

## 📋 常用API模式

### GET请求示例（带查询参数）

```typescript
/**
 * @openapi
 * /api/posts:
 *   get:
 *     summary: 获取文章列表
 *     description: 分页获取文章列表
 *     tags: [Posts]
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
 *           maximum: 50
 *           default: 10
 *       - name: status
 *         in: query
 *         schema:
 *           type: string
 *           enum: [draft, published]
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostsListResponse'
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const validation = validateSearchParams(searchParams, QuerySchema);
  if (validation instanceof Response) return validation;
  
  const { page, limit, status } = validation.data!;
  // ...
}
```

### POST请求示例（JSON数据）

```typescript
/**
 * @openapi
 * /api/posts:
 *   post:
 *     summary: 创建文章
 *     description: 创建新文章
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePost'
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostResponse'
 *       400:
 *         description: 请求参数错误
 *       409:
 *         description: 标题已存在
 */
export async function POST(request: Request) {
  const validation = await validateRequestJSON(request, CreatePostSchema);
  if (validation instanceof Response) return validation;
  
  const { title, content, categoryId, tags } = validation.data!;
  // ...
}
```

### 路径参数处理

```typescript
const UpdateUserSchema = z.object({
  nickname: z.string().min(2).max(20).optional(),
  bio: z.string().max(500).optional()
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  // 验证UUID格式
  const uuidSchema = z.string().uuid();
  const idValidation = uuidSchema.safeParse(id);
  if (!idValidation.success) {
    return response.badRequest({ message: "无效的用户ID格式" });
  }
  
  const validation = await validateRequestJSON(request, UpdateUserSchema);
  if (validation instanceof Response) return validation;
  
  const updateData = validation.data!;
  const user = await updateUser(id, updateData);
  
  return response.ok({ data: user, message: "更新成功" });
}
```

## 🛠️ 开发工作流

### 1. 启动开发环境

```bash
pnpm dev
```

启动后访问：
- 主应用：http://localhost:3000
- API文档：http://localhost:3001/docs/api

### 2. 开发流程

1. **定义Schema** → `packages/shared-types/src/api/`
2. **添加OpenAPI注释** → 引用Schema名称，指定路径和响应
3. **实现API** → `apps/web/src/app/api/`
4. **自动验证** → 使用 `validateRequestJSON`
5. **错误处理** → 使用 `response` 工具
6. **生成文档** → 运行 `pnpm generate-openapi`

### 3. 类型安全使用

```typescript
// Schema定义自动提供完整类型
const validation = await validateRequestJSON(request, UserSchema);
if (!(validation instanceof Response)) {
  // validation.data! 具有完整的TypeScript类型推导
  console.log(validation.data!.username); // string
  console.log(validation.data!.email);    // string
  console.log(validation.data!.nickname); // string | undefined
}
```

## 📚 最佳实践

### 1. Schema设计

```typescript
// 好的做法：详细的验证和错误信息
const UserSchema = z.object({
  username: z.string()
    .min(3, "用户名至少3个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "只能包含字母、数字和下划线"),
  email: z.string().email("邮箱格式不正确"),
  age: z.number().min(18, "年龄必须大于18岁")
});

// 复用基础Schema
const BaseUserSchema = z.object({
  username: z.string(),
  email: z.string().email()
});

const CreateUserSchema = BaseUserSchema.extend({
  password: z.string().min(8)
});

const UpdateUserSchema = BaseUserSchema.partial();
```

### 2. 错误处理

```typescript
// 统一错误格式
return response.badRequest({
  message: "用户输入错误",
  error: {
    code: "VALIDATION_FAILED",
    message: "请检查输入数据",
    details: { field: "email", reason: "格式不正确" }
  }
});
```

### 3. 性能优化

```typescript
// 使用速率限制
if (!(await limitControl(request))) {
  return response.tooManyRequests();
}

// 分页查询
const PaginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1).default(1)),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100).default(10))
});
```

## 🔧 故障排除

### 常见问题

1. **验证失败** → 检查Schema定义和输入数据格式
2. **类型错误** → 确保从 `packages/shared-types` 正确导入Schema
3. **响应格式** → 使用 `response` 工具确保统一格式

### 调试技巧

```typescript
// 开发时可以查看验证详情
const validation = await validateRequestJSON(request, schema, { 
  returnResponse: false 
});

if (!validation.success) {
  console.log("验证错误:", validation.errors);
}
```

---

现在您可以用简化的方式开发API：**定义Schema → 简化注释 → 自动验证 → 类型安全** 🎉

## 📝 OpenAPI注释要点

- 使用 `$ref: '#/components/schemas/SchemaName'` 引用Zod Schema
- 只需指定基本信息：路径、方法、tags、描述
- 响应状态码根据业务需要添加
- Schema的详细验证规则由Zod定义，无需重复编写
