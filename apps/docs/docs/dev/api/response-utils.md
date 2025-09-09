# API 响应工具指南

NeutralPress 提供了一套完整的 API 响应工具，确保所有 API 接口返回统一格式的响应。

## 导入方式

```typescript
import ResponseBuilder from "@/lib/server/response";

// 创建响应构建器实例
const response = new ResponseBuilder("serverless"); // 或 "serveraction"

// 或按需导入工具函数
import {
  createSecurityHeaders,
  createCacheHeaders,
  createPaginationMeta,
  fieldError,
} from "@/lib/server/response";
```

## ResponseBuilder 类

ResponseBuilder 是一个可配置的响应构建器，支持两种环境：

- `"serverless"` - 用于 API 路由（返回 NextResponse）
- `"serveraction"` - 用于 Server Actions（返回纯对象）

```typescript
// API 路由中使用
const response = new ResponseBuilder("serverless");

// Server Action 中使用
const response = new ResponseBuilder("serveraction");
```

## 可用方法
### 通用响应
- `response.response(config)` - 通用响应函数，可自定义所有参数

### 成功响应
- `response.ok(config?)` - 200 成功响应
- `response.created(config?)` - 201 创建成功
- `response.noContent(config?)` - 204 无内容
- `response.notModified(config?)` - 304 未修改

### 错误响应
- `response.badRequest(config?)` - 400 请求错误
- `response.unauthorized(config?)` - 401 未授权
- `response.forbidden(config?)` - 403 禁止访问
- `response.notFound(config?)` - 404 未找到
- `response.conflict(config?)` - 409 冲突
- `response.unprocessableEntity(config?)` - 422 验证失败
- `response.tooManyRequests(config?)` - 429 请求过多
- `response.serverError(config?)` - 500 服务器错误
- `response.serviceUnavailable(config?)` - 503 服务不可用

### 特殊响应
- `response.cached(config)` - 带缓存的成功响应（cacheConfig 必需）
- `response.validationError(config)` - 字段验证错误（field 必需）

### 工具函数
- `createPaginationMeta(page, pageSize, total)` - 创建分页元数据
- `fieldError(field, message, details?)` - 创建字段错误对象
- `createSecurityHeaders(customHeaders?)` - 创建安全响应头
- `createCacheHeaders(cacheConfig?)` - 创建缓存控制头

### 配置参数
所有快捷方法都接受可选的配置对象：
- `message?: string` - 自定义响应消息
- `data?: T` - 响应数据
- `error?: ApiError | string` - 错误信息
- `meta?: PaginationMeta` - 分页元数据
- `customHeaders?: HeadersInit` - 自定义响应头
- `cacheConfig?: CacheConfig` - 缓存配置

## 基本用法

### 成功响应

```typescript
import ResponseBuilder from "@/lib/server/response";

const response = new ResponseBuilder("serverless");

// 简单成功响应
export async function GET() {
  const data = { users: [], total: 0 };
  return response.ok({ data });
}

// 带消息的成功响应
export async function GET() {
  const data = { users: [], total: 0 };
  return response.ok({ 
    data,
    message: "获取用户列表成功" 
  });
}

// 创建成功响应
export async function POST() {
  const newUser = { id: "123", name: "John" };
  return response.created({ 
    data: newUser,
    message: "用户创建成功" 
  });
}

// 无内容响应
export async function DELETE() {
  return response.noContent({ 
    message: "删除成功" 
  });
}

// 无参数调用
export async function GET() {
  return response.ok(); // 返回默认成功响应
}
```

### 分页响应

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 1;
  const pageSize = Number(searchParams.get("pageSize")) || 10;

  const users = await getUsersPaginated(page, pageSize);
  const total = await getTotalUsers();

  const meta = createPaginationMeta(page, pageSize, total);

  return response.ok({
    data: users,
    message: "获取用户列表成功",
    meta
  });
}
```

## 错误响应

### 基础错误响应

```typescript
// 400 - 请求错误
export async function POST(request: Request) {
  try {
    const data = await request.json();
  } catch (error) {
    return response.badRequest({ 
      message: "请求体格式错误" 
    });
  }
}

// 401 - 未授权
export async function GET() {
  const token = getAuthToken();
  if (!token) {
    return response.unauthorized({ 
      message: "请先登录" 
    });
  }
}

// 403 - 禁止访问
export async function GET() {
  const user = await getCurrentUser();
  if (!user.isAdmin) {
    return response.forbidden({ 
      message: "权限不足" 
    });
  }
}

// 404 - 未找到
export async function GET() {
  const user = await findUser(id);
  if (!user) {
    return response.notFound({ 
      message: "用户不存在" 
    });
  }
}

// 500 - 服务器错误
export async function POST() {
  try {
    // 业务逻辑
  } catch (error) {
    return response.serverError({ 
      message: "系统异常，请稍后重试" 
    });
  }
}

// 简单错误响应（只传消息）
export async function DELETE() {
  return response.badRequest("删除失败");
}
```

### 详细错误信息

```typescript
// 使用结构化错误信息
export async function POST(request: Request) {
  const validation = validateUserData(data);
  if (!validation.success) {
    return response.badRequest({
      message: "用户数据验证失败",
      error: {
        code: "VALIDATION_ERROR",
        message: "输入数据不符合要求",
        details: validation.errors,
      },
    });
  }
}

// 字段级验证错误
export async function POST(request: Request) {
  const { email } = await request.json();

  if (!isValidEmail(email)) {
    return response.validationError({
      field: "email",
      errorMessage: "邮箱格式不正确",
      details: {
        pattern: "xxx@example.com",
        received: email,
      },
    });
  }
}

// 直接传递错误对象
export async function DELETE() {
  return response.forbidden({
    error: {
      code: "FEATURE_DISABLED",
      message: "删除功能已禁用"
    }
  });
}
```

## 缓存控制

### 基础缓存

```typescript
// 设置 10 分钟缓存
export async function GET() {
  const data = await getStaticData();

  const cacheConfig = {
    maxAge: 600, // 10分钟
    staleWhileRevalidate: 300, // 5分钟内可返回过期数据
  };

  return response.cached({
    data,
    cacheConfig,
    message: "获取静态数据成功"
  });
}
```

### 条件请求支持

```typescript
export async function GET(request: Request) {
  const data = await getData();
  const etag = generateETag(data); // 需要自己实现 generateETag
  const lastModified = new Date();

  // 检查条件请求
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return response.notModified();
  }

  const cacheConfig = {
    etag,
    lastModified,
    maxAge: 3600, // 1小时
  };

  return response.cached({
    data,
    cacheConfig,
    message: "获取数据成功"
  });
}
```

## 自定义响应头

```typescript
export async function GET() {
  const customHeaders = {
    "X-API-Version": "1.0",
    "X-Total-Count": "100",
  };

  return response.ok({
    data,
    message: "请求成功",
    customHeaders
  });
}
```

## 高级用法

### 自定义状态码

```typescript
// 使用通用响应函数
export async function POST() {
  const data = await processPartialUpdate();

  return response({
    status: 206,
    message: "部分更新成功",
    data
  });
}
```

### 创建错误对象

```typescript
// 手动创建结构化错误
const fieldErr = fieldError("username", "用户名已存在", {
  suggestions: ["user123", "user456"],
});

return response.conflict({
  message: "用户创建失败",
  error: fieldErr
});
```

## 实际使用示例

### 用户注册 API

以下是一个实际的用户注册 API 示例，展示了如何使用响应工具：

```typescript
// app/api/auth/register/route.ts
import response from "@/app/api/_utils/response";
import { RegisterUserSchema } from "@repo/shared-types/api/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 验证请求数据
    const validationResult = RegisterUserSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error!.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return response.badRequest({
        message: "数据验证失败",
        error: {
          code: "VALIDATION_ERROR",
          message: "请求数据格式不正确",
          details: { errors },
        },
      });
    }

    const { username, email, password, nickname } = validationResult.data!;

    // TODO: 检查用户名是否已存在
    // TODO: 检查邮箱是否已存在
    // TODO: 创建用户账户
    // TODO: 发送验证邮件

    return response.forbidden({
      message: "注册功能尚未实现",
      error: {
        code: "NOT_IMPLEMENTED",
        message: "注册功能尚未实现",
      },
    });

  } catch (error) {
    console.error("Registration error:", error);
    return response.serverError({
      message: "注册失败，请稍后重试",
    });
  }
}
```

## 完整示例

### 用户管理 API

```typescript
// app/api/users/route.ts
import response from "@/app/api/_utils/response";
import { createPaginationMeta, fieldError } from "@/app/api/_utils/response";
import { getUsersPaginated, createUser, validateUserData } from "@/lib/users";

// 获取用户列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 10;

    const users = await getUsersPaginated(page, pageSize);
    const total = await getTotalUsers();

    const meta = createPaginationMeta(page, pageSize, total);
    const etag = generateETag({ users, meta }); // 需要自己实现

    // 检查条件请求
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return response.notModified();
    }

    const cacheConfig = {
      maxAge: 300, // 5分钟缓存
      etag,
    };

    return response.cached({
      data: { users },
      cacheConfig,
      message: "获取用户列表成功",
      meta,
    });
  } catch (error) {
    console.error("获取用户列表失败:", error);
    return response.serverError({
      message: "获取用户列表失败"
    });
  }
}

// 创建用户
export async function POST(request: Request) {
  try {
    const userData = await request.json();

    // 验证数据
    const validation = validateUserData(userData);
    if (!validation.success) {
      return response.validationError({
        field: validation.field,
        errorMessage: validation.message,
        details: validation.errors,
      });
    }

    // 检查邮箱是否已存在
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
      return response.conflict({
        message: "用户已存在",
        error: {
          code: "EMAIL_EXISTS",
          message: "该邮箱已被注册",
          field: "email",
        },
      });
    }

    const newUser = await createUser(userData);

    const customHeaders = {
      Location: `/api/users/${newUser.id}`,
    };

    return response.created({
      data: newUser,
      message: "用户创建成功",
      customHeaders,
    });
  } catch (error) {
    console.error("创建用户失败:", error);
    return response.serverError({
      message: "创建用户失败",
      error: {
        code: "USER_CREATE_ERROR",
        message: error.message,
      },
    });
  }
}
```

## 响应格式

所有 API 响应都遵循统一格式：

```typescript
{
  "success": boolean,           // 请求是否成功
  "message": string,            // 响应消息
  "data": T | null,            // 响应数据
  "timestamp": string,          // ISO 8601 时间戳
  "requestId": string,          // 请求唯一标识
  "error": {                   // 错误详情（可选）
    "code": string,            // 错误代码
    "message": string,         // 错误消息
    "details": object,         // 错误详情（可选）
    "field": string           // 相关字段（可选）
  },
  "meta": {                    // 分页信息（可选）
    "page": number,
    "pageSize": number,
    "total": number,
    "totalPages": number,
    "hasNext": boolean,
    "hasPrev": boolean
  }
}
```
