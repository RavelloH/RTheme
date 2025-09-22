---
sidebar_position: 2
tags:
  - dev
  - api
---

# 如何编写API

本文档将指导您如何在NeutralPress项目中编写类型安全的API，使用Zod进行数据验证和自动生成OpenAPI文档。

## 🚀 现代化开发流程

NeutralPress采用基于Zod + 自动化schema发现的现代化API开发方式：

1. **定义Zod Schema** - 在 `packages/shared-types` 中定义数据结构
2. **自动注册Schema** - 使用 `registerSchema()` 自动注册到OpenAPI生成器
3. **添加简化注释** - 只需指定路径、方法和Schema引用
4. **使用验证工具** - 通过 `validateRequestJSON` 自动验证和错误处理
5. **类型安全开发** - 获得完整的TypeScript类型推导
6. **自动文档生成** - 从Zod Schema和注释生成完整OpenAPI文档

:::tip 新功能：自动化Schema发现
现在无需手动维护OpenAPI生成器中的schema列表！只需在API模块中使用 `registerSchema()` 注册，系统会自动发现并生成文档。
:::

## 📝 API开发步骤

### 1. 定义数据Schema

在 `packages/shared-types/src/api/` 中定义API的输入输出类型：

```typescript
// packages/shared-types/src/api/auth.ts
import { z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

export const RegisterUserSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少需要3个字符")
    .max(20, "用户名不能超过20个字符")
    .regex(/^[a-z0-9_]+$/, "用户名只能由小写字母、数字和下划线组成"),
  email: z.string().email("请输入有效的邮箱地址"),
  password: z
    .string()
    .min(6, "密码至少需要6个字符")
    .max(100, "密码不能超过100个字符"),
  nickname: z
    .string()
    .min(2, "昵称至少需要2个字符")
    .max(20, "昵称不能超过20个字符")
    .optional(),
});

export const UserDataSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  nickname: z.string(),
  role: z.enum(["USER", "ADMIN", "EDITOR"]),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  isEmailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// 使用响应构建器创建标准响应schemas
export const RegisterSuccessResponseSchema =
  createSuccessResponseSchema(UserDataSchema);
export const ValidationErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("VALIDATION_ERROR"),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
  }),
);

// 自动注册schemas到OpenAPI生成器
registerSchema("RegisterUser", RegisterUserSchema);
registerSchema("UserData", UserDataSchema);
registerSchema("RegisterSuccessResponse", RegisterSuccessResponseSchema);
registerSchema("ValidationErrorResponse", ValidationErrorResponseSchema);

export type RegisterUser = z.infer<typeof RegisterUserSchema>;
export type UserData = z.infer<typeof UserDataSchema>;
```

### 2. 添加OpenAPI注释

为API添加基本的OpenAPI注释，引用自动注册的Schema：

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
```

### 3. 实现API路由

在 `apps/web/src/app/api/` 中创建路由文件：

```typescript
// apps/web/src/app/api/auth/register/route.ts
import ResponseBuilder from "@/lib/server/response";
import { validateRequestJSON } from "@/lib/server/validator";
import { RegisterUserSchema } from "@repo/shared-types/api/auth";
import prisma from "@/lib/shared/prisma";
import limitControl from "@/lib/server/limit";
import { hashPassword } from "@/lib/server/password";
import emailUtils from "@/lib/server/email";

const response = new ResponseBuilder("serverless");

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

    // 检查用户是否存在
    const userExists = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });

    if (userExists) {
      return response.conflict({
        message: "用户名或邮箱已存在",
        error: {
          code: "USER_EXISTS",
          message: "用户名或邮箱已存在",
        },
      });
    }

    // 创建用户
    const hashedPassword = await hashPassword(password);
    const emailVerifyCode = emailUtils.generate();

    const user = await prisma.user.create({
      data: {
        username,
        email,
        nickname,
        password: hashedPassword,
        emailVerifyCode,
      },
    });

    return response.ok({
      data: user,
      message: "注册成功，请检查邮箱以验证账户",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return response.serverError({
      message: "注册失败，请稍后重试",
    });
  }
}
```

## 🔧 响应构建器系统

### 基础响应构建器

在 `packages/shared-types/src/api/common.ts` 中提供了三个核心响应构建器：

```typescript
// 成功响应 - 只包含必要字段，无冗余的error和meta
export const UserResponseSchema = createSuccessResponseSchema(UserDataSchema);
// 生成: { success: true, message, data: UserData, timestamp, requestId }

// 错误响应 - 只包含错误相关字段
export const ValidationErrorResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("VALIDATION_ERROR"),
    message: z.string(),
  }),
);
// 生成: { success: false, message, data: null, error, timestamp, requestId }

// 分页响应 - 包含分页元数据
export const UsersListResponseSchema = createPaginatedResponseSchema(
  z.object({ users: z.array(UserDataSchema) }),
);
// 生成: { success: true, message, data, meta: PaginationMeta, timestamp, requestId }
```

### 自动Schema注册

使用 `registerSchema()` 函数注册schemas到OpenAPI生成器：

```typescript
// 在每个API模块的底部添加
registerSchema("RegisterUser", RegisterUserSchema);
registerSchema("RegisterSuccessResponse", RegisterSuccessResponseSchema);
registerSchema("ValidationErrorResponse", ValidationErrorResponseSchema);
// ... 其他schemas
```

## 🛠️ 开发工作流

### 1. 启动开发环境

```bash
pnpm dev
```

启动后访问：

- 主应用：http://localhost:3000
- API文档：http://localhost:3001/docs/api

### 2. 自动化开发流程

1. **定义Schema** → `packages/shared-types/src/api/`
2. **注册Schema** → 在模块底部使用 `registerSchema()`
3. **添加OpenAPI注释** → 引用Schema名称，指定路径和响应
4. **实现API** → `apps/web/src/app/api/`
5. **自动验证** → 使用 `validateRequestJSON`
6. **错误处理** → 使用 `ResponseBuilder` 实例
7. **生成文档** → 运行 `pnpm generate-openapi` (自动发现所有注册的schemas)

### 3. 添加新API模块

当添加新的API模块时（如 `posts.ts`），只需：

```typescript
// packages/shared-types/src/api/posts.ts
export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  // ...
});

export const CreatePostResponseSchema = createSuccessResponseSchema(PostSchema);

// 注册所有schemas
registerSchema("Post", PostSchema);
registerSchema("CreatePostResponse", CreatePostResponseSchema);
```

然后更新生成器导入：

```typescript
// packages/openapi-generator/src/generator.ts
// 在 generateOpenAPISpec 函数中添加新模块导入
await import("@repo/shared-types/api/posts");
```

系统会自动发现并生成文档，无需手动维护schema列表！

## 📚 最佳实践

### 1. Schema设计模式

```typescript
// 使用响应构建器确保格式统一
const BaseUserSchema = z.object({
  username: z.string(),
  email: z.string().email(),
});

const CreateUserSchema = BaseUserSchema.extend({
  password: z.string().min(8),
});

const UpdateUserSchema = BaseUserSchema.partial();

// 为每种响应创建专门的schema
const UserSuccessResponseSchema = createSuccessResponseSchema(BaseUserSchema);
const UserListResponseSchema = createPaginatedResponseSchema(
  z.object({ users: z.array(BaseUserSchema) }),
);
```

### 2. 统一错误处理

```typescript
// 为不同错误类型创建专门的schemas
const ValidationErrorSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("VALIDATION_ERROR"),
    message: z.string(),
    details: z
      .array(
        z.object({
          field: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
  }),
);

const NotFoundErrorSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("NOT_FOUND"),
    message: z.string(),
  }),
);
```

### 3. 自动注册管理

```typescript
// 在每个API模块末尾统一注册
// 建议按类别组织
registerSchema("RegisterUser", RegisterUserSchema);
registerSchema("LoginUser", LoginUserSchema);
registerSchema("UserData", UserDataSchema);

// 响应schemas
registerSchema("RegisterSuccessResponse", RegisterSuccessResponseSchema);
registerSchema("LoginSuccessResponse", LoginSuccessResponseSchema);
registerSchema("ValidationErrorResponse", ValidationErrorResponseSchema);
```

## ⚡ 新特性亮点

### 自动化Schema发现

- ✅ 无需手动维护generator中的schema列表
- ✅ 添加新API时只需注册schema
- ✅ 自动同步，确保文档完整性

### 响应构建器系统

- ✅ 避免冗余字段（如成功响应不包含error字段）
- ✅ 统一的响应格式
- ✅ 类型安全的响应构建

### 类型安全验证

- ✅ 端到端类型推导
- ✅ 运行时验证
- ✅ 统一错误格式

---

现在您可以更高效地开发API：**定义Schema → 自动注册 → 简化注释 → 自动生成** 🎉
