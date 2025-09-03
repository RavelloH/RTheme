# API 响应工具指南

NeutralPress 提供了一套完整的 API 响应工具，确保所有 API 接口返回统一格式的响应。

## 导入方式

```typescript
import response from '@/app/api/_utils/response';

// 或按需导入
import { createSecurityHeaders, createCacheHeaders } from '@/app/api/_utils/response';
```

## 基本用法

### 成功响应

```typescript
// 自定义响应
export async function GET() {
  return response(200, "请求成功", { key: "value" });
}

// 简单成功响应
export async function GET() {
  const data = { users: [], total: 0 };
  return response.ok(data);
}

// 创建成功响应
export async function POST() {
  const newUser = { id: '123', name: 'John' };
  return response.created(newUser, "用户创建成功");
}

// 无内容响应
export async function DELETE() {
  return response.noContent("删除成功");
}
```

### 分页响应

```typescript
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = Number(searchParams.get('pageSize')) || 10;
  
  const users = await getUsersPaginated(page, pageSize);
  const total = await getTotalUsers();
  
  const meta = response.createPaginationMeta(page, pageSize, total);
  
  return response.ok(users, "获取用户列表成功", undefined, meta);
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
    return response.badRequest("请求体格式错误");
  }
}

// 401 - 未授权
export async function GET() {
  const token = getAuthToken();
  if (!token) {
    return response.unauthorized("请先登录");
  }
}

// 404 - 未找到
export async function GET() {
  const user = await findUser(id);
  if (!user) {
    return response.notFound("用户不存在");
  }
}

// 500 - 服务器错误
export async function POST() {
  try {
    // 业务逻辑
  } catch (error) {
    return response.serverError("系统异常，请稍后重试");
  }
}
```

### 详细错误信息

```typescript
// 使用结构化错误信息
export async function POST(request: Request) {
  const validation = validateUserData(data);
  if (!validation.success) {
    return response.badRequest("用户数据验证失败", {
      code: 'VALIDATION_ERROR',
      message: '输入数据不符合要求',
      details: validation.errors,
    });
  }
}

// 字段级验证错误
export async function POST(request: Request) {
  const { email } = await request.json();
  
  if (!isValidEmail(email)) {
    return response.validationError('email', '邮箱格式不正确', {
      pattern: 'xxx@example.com',
      received: email,
    });
  }
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
  
  return response.cached(data, cacheConfig);
}
```

### 条件请求支持

```typescript
export async function GET(request: Request) {
  const data = await getData();
  const etag = response.generateETag(data);
  const lastModified = new Date();
  
  // 检查条件请求
  const { isNotModified } = response.checkConditionalRequest(
    request, 
    etag, 
    lastModified
  );
  
  if (isNotModified) {
    return response.notModified();
  }
  
  const cacheConfig = {
    etag,
    lastModified,
    maxAge: 3600, // 1小时
  };
  
  return response.cached(data, cacheConfig);
}
```

## 自定义响应头

```typescript
export async function GET() {
  const customHeaders = {
    'X-API-Version': '1.0',
    'X-Total-Count': '100',
  };
  
  return response.ok(data, "请求成功", customHeaders);
}
```

## 高级用法

### 自定义状态码

```typescript
// 使用通用响应函数
export async function POST() {
  const data = await processPartialUpdate();
  
  return response(206, "部分更新成功", data);
}
```

### 创建错误对象

```typescript
// 手动创建结构化错误
const fieldErr = response.fieldError('username', '用户名已存在', {
  suggestions: ['user123', 'user456'],
});

return response.conflict("用户创建失败", fieldErr);
```

## 完整示例

### 用户管理 API

```typescript
// app/api/users/route.ts
import response from '@/app/api/_utils/response';
import { getUsersPaginated, createUser, validateUserData } from '@/lib/users';

// 获取用户列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 1;
    const pageSize = Number(searchParams.get('pageSize')) || 10;
    
    const users = await getUsersPaginated(page, pageSize);
    const total = await getTotalUsers();
    
    const meta = response.createPaginationMeta(page, pageSize, total);
    const etag = response.generateETag({ users, meta });
    
    // 检查条件请求
    const { isNotModified } = response.checkConditionalRequest(request, etag);
    if (isNotModified) {
      return response.notModified();
    }
    
    const cacheConfig = {
      maxAge: 300, // 5分钟缓存
      etag,
    };
    
    return response.cached({ users }, cacheConfig, "获取用户列表成功", undefined, meta);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return response.serverError("获取用户列表失败");
  }
}

// 创建用户
export async function POST(request: Request) {
  try {
    const userData = await request.json();
    
    // 验证数据
    const validation = validateUserData(userData);
    if (!validation.success) {
      return response.validationError(
        validation.field, 
        validation.message,
        validation.errors
      );
    }
    
    // 检查邮箱是否已存在
    const existingUser = await findUserByEmail(userData.email);
    if (existingUser) {
      return response.conflict("用户已存在", {
        code: 'EMAIL_EXISTS',
        message: '该邮箱已被注册',
        field: 'email',
      });
    }
    
    const newUser = await createUser(userData);
    
    const customHeaders = {
      'Location': `/api/users/${newUser.id}`,
    };
    
    return response.created(newUser, "用户创建成功", customHeaders);
  } catch (error) {
    console.error('创建用户失败:', error);
    return response.serverError("创建用户失败", {
      code: 'USER_CREATE_ERROR',
      message: error.message,
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