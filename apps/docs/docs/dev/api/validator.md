# API 验证工具指南

NeutralPress 提供了一套完整的 API 输入验证工具，基于 Zod 提供类型安全的数据验证和统一的错误处理。

## 导入方式

```typescript
import { 
  validateRequestData,
  validateRequestJSON,
  validateSearchParams,
  validate,
  validateJSON,
  ValidationResult,
  ValidationErrorDetail,
  ValidationOptions
} from "@/lib/server/validator";
```

## 核心接口

### ValidationResult&lt;T&gt;
验证结果接口，包含成功状态、数据和错误信息：

```typescript
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationErrorDetail[];
}
```

### ValidationErrorDetail
验证错误详情：

```typescript
interface ValidationErrorDetail {
  field: string;    // 错误字段路径
  message: string;  // 错误消息
}
```

### ValidationOptions
验证配置选项：

```typescript
interface ValidationOptions {
  errorMessage?: string;      // 自定义错误消息
  returnResponse?: boolean;   // 是否返回响应对象，默认为 true
}
```

## 主要验证函数

### validateRequestData()
验证请求体数据（同步）

```typescript
// 返回响应对象（默认）
function validateRequestData<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): NextResponse | ValidationResult<T>

// 只返回验证结果
function validateRequestData<T>(
  body: unknown,
  schema: z.ZodSchema<T>,
  options: ValidationOptions & { returnResponse: false }
): ValidationResult<T>
```

### validateRequestJSON()
验证 JSON 请求数据（异步）

```typescript
// 返回响应对象（默认）
async function validateRequestJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): Promise<NextResponse | ValidationResult<T>>

// 只返回验证结果
async function validateRequestJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>,
  options: ValidationOptions & { returnResponse: false }
): Promise<ValidationResult<T>>
```

### validateSearchParams()
验证查询参数

```typescript
// 返回响应对象（默认）
function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
  options?: ValidationOptions
): NextResponse | ValidationResult<T>

// 只返回验证结果
function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>,
  options: ValidationOptions & { returnResponse: false }
): ValidationResult<T>
```

### validate() 和 validateJSON()
快速验证工具函数，只返回验证结果：

```typescript
function validate<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): ValidationResult<T>

async function validateJSON<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>>
```

## 基本用法

### 验证 JSON 请求体

```typescript
import { z } from "zod";
import { validateRequestJSON } from "@/lib/server/validator";

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(18)
});

export async function POST(request: Request) {
  // 直接返回响应（推荐用法）
  const result = await validateRequestJSON(request, UserSchema, {
    errorMessage: "用户数据验证失败"
  });
  
  // 如果验证失败，会直接返回错误响应
  if (result instanceof NextResponse) {
    return result;
  }
  
  // 验证成功，继续处理业务逻辑
  const userData = result.data!;
  console.log(userData.name); // 类型安全
  
  // 处理业务逻辑...
  return NextResponse.json({ success: true });
}
```

### 只获取验证结果

```typescript
export async function POST(request: Request) {
  // 只返回验证结果，不返回响应对象
  const validation = await validateRequestJSON(request, UserSchema, {
    returnResponse: false
  });
  
  if (!validation.success) {
    // 自定义错误处理
    console.error("验证失败:", validation.errors);
    
    return NextResponse.json({
      error: "数据格式不正确",
      details: validation.errors
    }, { status: 400 });
  }
  
  // 使用验证后的数据
  const userData = validation.data!;
  // ...
}
```

### 验证查询参数

```typescript
const SearchSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)),
  keyword: z.string().optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const result = validateSearchParams(searchParams, SearchSchema);
  
  if (result instanceof NextResponse) {
    return result;
  }
  
  const { page, limit, keyword } = result.data!;
  
  // 使用验证后的查询参数
  const users = await getUserList({ page, limit, keyword });
  
  return NextResponse.json({ users });
}
```

### 验证已解析的数据

```typescript
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    
    // 验证已解析的数据
    const result = validateRequestData(body, UserUpdateSchema, {
      errorMessage: "更新数据格式错误"
    });
    
    if (result instanceof NextResponse) {
      return result;
    }
    
    const updateData = result.data!;
    // 处理更新逻辑...
    
  } catch (error) {
    return NextResponse.json({
      error: "请求体必须是有效的 JSON"
    }, { status: 400 });
  }
}
```

## 快速验证函数

### 简单验证

```typescript
import { validate, validateJSON } from "@/lib/server/validator";

// 验证普通数据
const result = validate(userData, UserSchema);
if (result.success) {
  console.log(result.data!.name);
} else {
  console.error(result.errors);
}

// 验证 JSON 请求
const jsonResult = await validateJSON(request, UserSchema);
if (jsonResult.success) {
  const user = jsonResult.data!;
  // ...
}
```

## 错误处理

### 验证错误格式

当验证失败时，错误信息采用以下格式：

```json
{
  "success": false,
  "message": "数据验证失败",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "requestId": "req_123456789",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求数据格式不正确",
    "details": {
      "errors": [
        {
          "field": "email",
          "message": "Invalid email"
        },
        {
          "field": "age",
          "message": "Number must be greater than or equal to 18"
        }
      ]
    }
  }
}
```

### JSON 解析错误

当 JSON 格式无效时：

```json
{
  "success": false,
  "message": "请求格式错误",
  "error": {
    "code": "INVALID_JSON",
    "message": "请求体必须是有效的 JSON 格式"
  }
}
```

### 内部验证错误

当验证过程中发生异常时：

```json
{
  "success": false,
  "message": "验证失败，请稍后重试",
  "error": {
    "code": "VALIDATION_INTERNAL_ERROR",
    "message": "验证过程中发生内部错误"
  }
}
```

## 高级用法

### 自定义错误消息

```typescript
const result = await validateRequestJSON(request, UserSchema, {
  errorMessage: "用户注册信息格式不正确"
});
```

### 复杂 Schema 验证

```typescript
const CreatePostSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(200, "标题过长"),
  content: z.string().min(10, "内容至少需要10个字符"),
  tags: z.array(z.string()).max(10, "标签数量不能超过10个"),
  category: z.string().uuid("分类ID格式不正确"),
  publishAt: z.string().datetime().optional(),
  metadata: z.object({
    seoTitle: z.string().max(60).optional(),
    seoDescription: z.string().max(160).optional()
  }).optional()
});

export async function POST(request: Request) {
  const result = await validateRequestJSON(request, CreatePostSchema);
  
  if (result instanceof NextResponse) {
    return result;
  }
  
  const postData = result.data!;
  // postData 具有完整的类型推导
  console.log(postData.title);        // string
  console.log(postData.tags);         // string[]
  console.log(postData.metadata?.seoTitle); // string | undefined
}
```

### 查询参数类型转换

```typescript
const PaginationSchema = z.object({
  page: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1, "页码必须大于0")),
  limit: z.string()
    .transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(100, "每页数量在1-100之间")),
  sort: z.enum(["asc", "desc"]).default("desc"),
  status: z.enum(["draft", "published", "archived"]).optional()
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const result = validateSearchParams(searchParams, PaginationSchema);
  
  if (result instanceof NextResponse) {
    return result;
  }
  
  const { page, limit, sort, status } = result.data!;
  // page 和 limit 已自动转换为 number 类型
  // sort 有默认值
  // status 是可选的
}
```

## 实际应用示例

### 用户注册 API

```typescript
// app/api/auth/register/route.ts
import { validateRequestJSON } from "@/lib/server/validator";
import { z } from "zod";

const RegisterSchema = z.object({
  username: z.string()
    .min(3, "用户名至少3个字符")
    .max(20, "用户名最多20个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  email: z.string().email("邮箱格式不正确"),
  password: z.string()
    .min(8, "密码至少8个字符")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "密码必须包含大小写字母和数字"),
  nickname: z.string().min(1, "昵称不能为空").max(50, "昵称最多50个字符")
});

export async function POST(request: Request) {
  // 验证请求数据
  const validation = await validateRequestJSON(request, RegisterSchema, {
    errorMessage: "注册信息格式不正确"
  });
  
  if (validation instanceof NextResponse) {
    return validation;
  }
  
  const { username, email, password, nickname } = validation.data!;
  
  // 检查用户名和邮箱是否已存在
  const existingUser = await checkUserExists(username, email);
  if (existingUser) {
    return NextResponse.json({
      success: false,
      message: "用户已存在",
      error: {
        code: "USER_EXISTS",
        message: existingUser.type === "username" 
          ? "用户名已被占用" 
          : "邮箱已被注册"
      }
    }, { status: 409 });
  }
  
  // 创建用户
  const user = await createUser({ username, email, password, nickname });
  
  return NextResponse.json({
    success: true,
    message: "注册成功",
    data: { userId: user.id }
  }, { status: 201 });
}
```

### 文章查询 API

```typescript
// app/api/posts/route.ts
import { validateSearchParams } from "@/lib/server/validator";

const PostQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(50)),
  category: z.string().uuid().optional(),
  tag: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  author: z.string().uuid().optional(),
  search: z.string().optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const validation = validateSearchParams(searchParams, PostQuerySchema);
  
  if (validation instanceof NextResponse) {
    return validation;
  }
  
  const queryParams = validation.data!;
  
  // 使用类型安全的查询参数
  const posts = await getPostsWithFilters(queryParams);
  const total = await countPostsWithFilters(queryParams);
  
  return NextResponse.json({
    success: true,
    data: { posts },
    meta: {
      page: queryParams.page,
      limit: queryParams.limit,
      total,
      totalPages: Math.ceil(total / queryParams.limit)
    }
  });
}
```

## 最佳实践

### 1. 优先使用直接返回响应的方式

```typescript
// 推荐：直接返回响应
const result = await validateRequestJSON(request, schema);
if (result instanceof NextResponse) {
  return result; // 验证失败直接返回
}
// 继续处理业务逻辑

// 不推荐：手动检查验证结果
const result = await validateRequestJSON(request, schema, { returnResponse: false });
if (!result.success) {
  return NextResponse.json({...}, { status: 400 });
}
```

### 2. 充分利用类型推导

```typescript
const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

const result = await validateRequestJSON(request, UserSchema);
if (!(result instanceof NextResponse)) {
  // result.data! 具有完整类型推导
  console.log(result.data!.name);  // TypeScript 知道这是 string
  console.log(result.data!.age);   // TypeScript 知道这是 number
}
```

### 3. 合理使用自定义错误消息

```typescript
// 为不同场景提供合适的错误消息
const validation = await validateRequestJSON(request, UserSchema, {
  errorMessage: "用户信息格式不正确，请检查输入数据"
});
```

### 4. Schema 复用

```typescript
// 定义在 packages/shared-types 中
export const BaseUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email()
});

export const CreateUserSchema = BaseUserSchema.extend({
  password: z.string().min(8)
});

export const UpdateUserSchema = BaseUserSchema.partial();
```

这个验证工具与项目的响应工具完美集成，提供了类型安全、统一错误处理和良好开发体验的完整解决方案。