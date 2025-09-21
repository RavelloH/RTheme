---
sidebar_position: 1
tags:
  - dev
---

# 开发文档

欢迎为 NeutralPress 贡献你的Code！简单介绍下此项目：

NeutralPress 是一个基于Next.js的CMS系统，旨在结合静态站点生成器（如Hexo）和动态CMS系统（如WordPress）的优点，提供一个易于使用且功能强大的内容管理平台。

仅当内容变更时，NeutralPress 才会使用动态增量再生（ISR）技术重新生成页面，而在内容未变更时，页面将呈现静态页面的特点，既确保内容可实时更新，又能享受静态页面的高性能、SEO友好和低成本优势。

| 框架/功能    | 静态站点生成器（如Hexo） | 动态CMS系统（如WordPress） | NeutralPress |
| ------------ | ------------------------ | -------------------------- | ------------ |
| 文章实时更新 | ❌                       | ✅                         | ✅           |
| 部署基本免费 | ✅                       | ❌                         | ✅           |
| 内置内容管理 | ❌                       | ✅                         | ✅           |
| 自带评论系统 | ❌                       | ✅                         | ✅           |
| 不用定期维护 | ✅                       | ❌                         | ✅           |
| 静态SEO优化  | ✅                       | ❌                         | ✅           |
| 用户管理系统 | ❌                       | ✅                         | ✅           |
| 自带全站搜索 | ❌                       | ✅                         | ✅           |
| 站内消息系统 | ❌                       | ✅                         | ✅           |
| 草稿箱       | ❌                       | ✅                         | ✅           |

> NeutralPress 的前身是 RTheme。因此名已经沿用多年，此项目逐渐从一个静态CSS主题，经过5年时间发展为一个完整的CMS系统，"RTheme"已不再适合描述此项目的功能和定位，于是在2025年更名为 NeutralPress。

## 版本

当前版本：v5

## 架构概览

NeutralPress 采用现代化的单体仓库（Monorepo）架构，基于 Turborepo + pnpm workspaces 管理多个相关联的包和应用。

### 技术栈
- **前端框架**: Next.js 15 + React 19 (App Router)
- **数据库**: PostgreSQL + Prisma ORM v6.15.0
- **类型系统**: TypeScript 5.9.2 (严格模式)
- **样式系统**: Tailwind CSS v4 + CSS 变量主题
- **状态管理**: Zustand + 广播消息系统
- **动画系统**: Framer Motion
- **主题管理**: next-themes (明暗模式)
- **API 验证**: Zod (运行时类型验证)
- **文档系统**: Docusaurus + OpenAPI 3.0
- **构建工具**: Turborepo + pnpm workspaces
- **开发工具**: Turbopack (开发构建)

## 目录结构

```
NeutralPress/
├── apps/                           # 应用程序
│   ├── web/                       # 主 Web 应用 (Next.js 15)
│   │   ├── src/
│   │   │   ├── app/              # App Router 路由
│   │   │   │   ├── api/          # API 路由
│   │   │   │   └── (routes)/     # 页面路由
│   │   │   ├── components/       # React 组件
│   │   │   └── lib/              # 工具库
│   │   ├── prisma/               # 数据库 schema 和迁移
│   │   └── public/               # 静态资源
│   └── docs/                      # 文档站点 (Docusaurus)
│       ├── docs/                 # 文档内容
│       └── src/                  # 文档站自定义组件
│
├── packages/                       # 共享包
│   ├── shared-types/             # Zod Schema 和类型定义
│   │   └── src/api/              # API 类型定义
│   ├── openapi-generator/        # OpenAPI 文档生成器
│   ├── openapi-spec/            # 生成的 OpenAPI 规范文件
│   ├── eslint-config/           # 共享 ESLint 配置
│   └── typescript-config/       # 共享 TypeScript 配置
│
├── turbo.json                      # Turborepo 配置
├── pnpm-workspace.yaml            # pnpm 工作区配置
└── package.json                   # 根包配置
```

## 核心特性

### 🔧 开发体验
- **类型安全**: 端到端的 TypeScript 类型推导
- **自动验证**: Zod Schema 提供运行时数据验证
- **热重载**: 开发环境支持快速热重载
- **统一配置**: 共享的 ESLint 和 TypeScript 配置

### 📚 文档系统  
- **自动生成**: 从 Zod Schema 自动生成 OpenAPI 文档
- **实时同步**: 代码和文档保持同步
- **交互式**: Docusaurus 提供现代化的文档体验

### 🚀 构建系统
- **并行构建**: Turborepo 提供高效的并行构建
- **智能缓存**: 构建结果智能缓存，加速开发
- **依赖管理**: pnpm 提供高效的包管理

### 🗄️ 数据层
- **现代 ORM**: Prisma 提供类型安全的数据库访问
- **迁移系统**: 完整的数据库版本控制
- **类型生成**: 自动生成数据库类型定义

### 🚄 缓存系统
- **配置缓存**: 高性能配置数据缓存，减少数据库查询
- **菜单缓存**: 完整的菜单和页面关系数据缓存
- **读写分离**: 缓存生成与读取职责分离，提高维护性
- **环境区分**: 开发环境直连数据库，生产环境使用缓存
- **统一管理**: 缓存文件统一存储在 `.cache/` 目录

## 开发环境

### 系统要求
- Node.js 18+
- pnpm 9.0.0+
- PostgreSQL 数据库

### 快速开始
```bash
# 安装依赖
pnpm install

# 启动开发环境
pnpm dev
```

启动后访问：
- **主应用**: http://localhost:3000
- **API 文档**: http://localhost:3001/docs/api

### 常用命令
```bash
# 开发
pnpm dev                    # 启动所有服务
pnpm build                  # 构建所有应用
pnpm lint                   # 代码检查 (零警告策略)
pnpm check-types           # TypeScript 类型检查
pnpm generate-openapi      # 生成 API 文档

# 数据库
cd apps/web
pnpm gen-prisma             # 生成 Prisma 客户端
npx prisma migrate dev       # 运行数据库迁移
npx prisma studio            # 打开数据库管理界面
```
