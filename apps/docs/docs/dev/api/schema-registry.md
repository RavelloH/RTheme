# 自动化Schema注册系统

NeutralPress 提供了一套自动化的Schema注册和发现系统，让OpenAPI文档生成更加智能和便捷。

## 🌟 系统特点

- **自动发现**: 系统自动发现所有已注册的schemas
- **零维护**: 无需手动维护generator中的schema列表
- **类型安全**: 完整的TypeScript类型支持
- **响应构建器**: 统一的响应格式构建工具

## 🔧 核心API

### registerSchema()

用于将schema注册到全局注册表中：

```typescript
import { registerSchema } from "./common.js";

registerSchema("UserData", UserDataSchema);
registerSchema("CreateUserResponse", CreateUserResponseSchema);
```

### getAllRegisteredSchemas()

获取所有已注册的schemas（主要供OpenAPI生成器使用）：

```typescript
import { getAllRegisteredSchemas } from "@repo/shared-types/src/api/common";

const schemas = getAllRegisteredSchemas();
// 返回: Array<{ name: string, schema: z.ZodTypeAny }>
```

### 响应构建器

提供三种标准响应构建器：

```typescript
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  createPaginatedResponseSchema,
} from "./common.js";

// 成功响应 - 不包含error和meta字段
const UserResponseSchema = createSuccessResponseSchema(UserDataSchema);

// 错误响应 - 不包含data字段（data为null）
const ErrorResponseSchema = createErrorResponseSchema(ErrorSchema);

// 分页响应 - 包含meta分页信息
const ListResponseSchema = createPaginatedResponseSchema(ListDataSchema);
```

## 📋 使用步骤

### 1. 定义Schema

```typescript
// packages/shared-types/src/api/posts.ts
import { z } from "zod";
import {
  createSuccessResponseSchema,
  createErrorResponseSchema,
  registerSchema,
} from "./common.js";

export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  slug: z.string(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const UpdatePostSchema = CreatePostSchema.partial();
```

### 2. 创建响应Schemas

```typescript
// 使用构建器创建响应schemas
export const PostSuccessResponseSchema =
  createSuccessResponseSchema(PostSchema);

export const PostListResponseSchema = createPaginatedResponseSchema(
  z.object({
    posts: z.array(PostSchema),
  }),
);

export const PostNotFoundResponseSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("POST_NOT_FOUND"),
    message: z.string(),
  }),
);

export const PostValidationErrorResponseSchema = createErrorResponseSchema(
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
```

### 3. 注册所有Schemas

```typescript
// 在模块底部注册所有schemas
registerSchema("Post", PostSchema);
registerSchema("CreatePost", CreatePostSchema);
registerSchema("UpdatePost", UpdatePostSchema);

// 注册响应schemas
registerSchema("PostSuccessResponse", PostSuccessResponseSchema);
registerSchema("PostListResponse", PostListResponseSchema);
registerSchema("PostNotFoundResponse", PostNotFoundResponseSchema);
registerSchema(
  "PostValidationErrorResponse",
  PostValidationErrorResponseSchema,
);

// 导出类型
export type Post = z.infer<typeof PostSchema>;
export type CreatePost = z.infer<typeof CreatePostSchema>;
export type UpdatePost = z.infer<typeof UpdatePostSchema>;
```

### 4. 更新OpenAPI生成器

```typescript
// packages/openapi-generator/src/generator.ts
// 在generateOpenAPISpec函数中添加新模块导入
export async function generateOpenAPISpec(): Promise<OpenAPISpec> {
  // ...

  try {
    // 导入所有API模块来触发schema注册
    await import("@repo/shared-types/api/common");
    await import("@repo/shared-types/api/auth");
    await import("@repo/shared-types/api/posts");  // 新增
    // 你可以在这里添加更多的API模块导入

    // 获取所有已注册的schemas
    const registeredSchemas = schemas.getAllRegisteredSchemas();
    // ...
  }
}
```

### 5. 在API中使用

```typescript
// apps/web/src/app/api/posts/route.ts
/**
 * @openapi
 * /api/posts:
 *   get:
 *     summary: 获取文章列表
 *     tags: [Posts]
 *     responses:
 *       200:
 *         description: 获取成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostListResponse'
 *   post:
 *     summary: 创建文章
 *     tags: [Posts]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePost'
 *     responses:
 *       200:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostSuccessResponse'
 *       400:
 *         description: 验证失败
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PostValidationErrorResponse'
 */

import { validateRequestJSON } from "@/app/api/_utils/validator";
import { CreatePostSchema } from "@repo/shared-types/api/posts";

export async function POST(request: Request) {
  const validation = await validateRequestJSON(request, CreatePostSchema);
  if (validation instanceof Response) return validation;

  const postData = validation.data!;
  // postData 具有完整的TypeScript类型推导
  console.log(postData.title); // string
  console.log(postData.status); // "DRAFT" | "PUBLISHED"

  // 创建文章逻辑...
}
```

## 🎯 最佳实践

### Schema命名规范

```typescript
// 数据模型
registerSchema("User", UserSchema);
registerSchema("Post", PostSchema);
registerSchema("Comment", CommentSchema);

// 请求schemas
registerSchema("CreateUser", CreateUserSchema);
registerSchema("UpdateUser", UpdateUserSchema);
registerSchema("LoginUser", LoginUserSchema);

// 响应schemas
registerSchema("UserSuccessResponse", UserSuccessResponseSchema);
registerSchema("UserListResponse", UserListResponseSchema);
registerSchema("ValidationErrorResponse", ValidationErrorResponseSchema);
registerSchema("NotFoundErrorResponse", NotFoundErrorResponseSchema);
```

### 模块化组织

```typescript
// packages/shared-types/src/api/users.ts
// 用户相关的所有schemas和注册

// packages/shared-types/src/api/posts.ts
// 文章相关的所有schemas和注册

// packages/shared-types/src/api/comments.ts
// 评论相关的所有schemas和注册
```

### 错误处理标准化

```typescript
// 为每个模块创建标准错误schemas
const UserNotFoundErrorSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("USER_NOT_FOUND"),
    message: z.string(),
  }),
);

const UserValidationErrorSchema = createErrorResponseSchema(
  z.object({
    code: z.literal("USER_VALIDATION_ERROR"),
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

registerSchema("UserNotFoundResponse", UserNotFoundErrorSchema);
registerSchema("UserValidationErrorResponse", UserValidationErrorSchema);
```

## 🔍 调试和监控

### 查看已注册的Schemas

```typescript
import { getAllRegisteredSchemas } from "@repo/shared-types/src/api/common";

// 在开发环境中查看所有已注册的schemas
if (process.env.NODE_ENV === "development") {
  const schemas = getAllRegisteredSchemas();
  console.log(
    "已注册的schemas:",
    schemas.map((s) => s.name),
  );
}
```

### 生成器日志

OpenAPI生成器会输出详细的日志信息：

```bash
[INFO] 正在生成 OpenAPI 规范...
[INFO] 正在扫描API目录: E:\NeutralPress\apps\web\src\app\api
[INFO] 扫描到 3 个API端点
[INFO] 发现 15 个已注册的schemas  # 这里显示注册的schema数量
[SUCC] OpenAPI 规范已生成:
[SUCC]  YAML: E:\NeutralPress\packages\openapi-spec\openapi.yaml
[SUCC]  JSON: E:\NeutralPress\packages\openapi-spec\openapi.json
```

## 🚀 优势总结

### 开发效率

- ✅ 一次注册，自动发现
- ✅ 无需维护重复的schema列表
- ✅ 新增API模块时只需添加导入

### 类型安全

- ✅ 完整的TypeScript类型推导
- ✅ 编译时类型检查
- ✅ 运行时数据验证

### 文档质量

- ✅ 自动同步，确保文档完整性
- ✅ 精确的响应格式（无冗余字段）
- ✅ 一致的错误处理格式

### 维护成本

- ✅ 集中化的schema管理
- ✅ 自动化的文档生成
- ✅ 减少手动维护工作

这个系统让API开发变得更加高效和可靠，同时确保了文档和代码的完美同步。
