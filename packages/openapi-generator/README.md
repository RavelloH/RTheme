# @repo/openapi-generator

OpenAPI 规范生成工具。

## 功能

- 从 Zod Schema 自动生成 OpenAPI 3.0.3 规范
- 扫描 API 路由文件中的 `@openapi` JSDoc 注释
- 以 YAML 和 JSON 双格式输出

## 使用方法

### 生成 OpenAPI 规范

```bash
# 从根目录执行
pnpm generate-openapi

# 或在此包目录执行
pnpm generate
```

### 开发模式（自动监控）

```bash
# 启动文件监控，自动重新生成
pnpm dev
```

监控以下文件变化：

- `apps/web/src/app/api/**/route.{ts,js}` - API 路由
- `packages/shared-types/src/api/**/*.ts` - Zod Schema 定义

## 输出文件

生成的规范文件位于当前包目录：

- `openapi.yaml` - YAML 格式（421KB）
- `openapi.json` - JSON 格式（588KB）

## 在其他应用中使用

### 在 docs 应用中使用

```typescript
// apps/docs/src/app/api-docs/page.tsx
import spec from "@repo/openapi-generator/openapi.json" with { type: "json" };

// 使用 Swagger UI、Scalar 等组件展示
```

### 直接读取文件

```typescript
import { readFileSync } from "fs";
import { join } from "path";

const specPath = join(
  process.cwd(),
  "../packages/openapi-generator/openapi.json",
);
const spec = JSON.parse(readFileSync(specPath, "utf-8"));
```

## 开发

### 构建

```bash
pnpm build
```

### 类型检查

```bash
pnpm check-types
```

### 清理

```bash
pnpm clean
```

## 技术细节

- **Zod 版本**: v4.1.5
- **OpenAPI 版本**: 3.0.3
- **转换目标**: `openapi-3.0`
- **Schema 注册**: 通过 `registerSchema()` 全局注册

## 架构

```txt
packages/shared-types
    ↓ (Zod Schema 定义)
packages/openapi-generator
    ↓ (扫描 + 转换 + 生成)
openapi.{yaml,json}
    ↓ (输出文件)
apps/docs (消费)
```
