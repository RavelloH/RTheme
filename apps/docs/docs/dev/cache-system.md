---
sidebar_position: 6
tags:
  - dev
  - cache
  - performance
---

# 缓存系统

NeutralPress 实现了高性能的缓存系统，用于减少数据库压力，提升应用性能。缓存系统采用读写分离架构，职责明确，易于维护。

## 缓存架构

### 读写分离设计

- **生成脚本**: `scripts/` 目录下的专门脚本负责生成缓存文件
- **读取模块**: `lib/server/` 下的模块负责读取缓存数据
- **职责分离**: 生成逻辑与读取逻辑完全分离，提高代码可维护性

### 缓存类型

#### 1. 配置缓存
- **文件**: `.config-cache.json`
- **用途**: 缓存数据库中的配置项，减少配置查询
- **包含**: 完整的配置数据，包括键值对、描述、更新时间等

#### 2. 菜单缓存
- **文件**: `.menu-cache.json`
- **用途**: 缓存菜单项和关联的页面数据
- **包含**: 完整的菜单结构，包括页面关系、排序、状态等

## 文件结构

```
apps/web/
├── .cache/                          # 缓存文件目录
│   ├── .config-cache.json           # 配置缓存
│   └── .menu-cache.json            # 菜单缓存
├── scripts/                         # 缓存生成脚本
│   ├── generate-config-cache.ts     # 配置缓存生成器
│   └── generate-menu-cache.ts      # 菜单缓存生成器
└── src/lib/server/                 # 缓存读取模块
    ├── configCache.ts              # 配置缓存读取器
    └── menuCache.ts                # 菜单缓存读取器
```

## 环境区分

### 开发环境
- 直接从数据库读取数据
- 实时反映数据变化
- 便于开发和调试

### 生产环境
- 从缓存文件读取数据
- 减少数据库查询压力
- 提升应用性能

## 缓存生成流程

### 预构建阶段
在项目构建过程中，自动执行缓存生成：

1. **环境检查**: 验证数据库连接和环境变量
2. **数据库迁移**: 执行必要的数据库迁移
3. **数据种子**: 初始化基础配置数据
4. **配置缓存**: 生成配置缓存文件
5. **菜单缓存**: 生成菜单缓存文件

### 生成脚本特性

#### 错误处理
- Prisma 客户端初始化失败时创建空缓存文件
- 详细的错误日志记录
- 不阻塞构建流程

#### 跨平台兼容
- 使用 `pathToFileURL` 确保跨平台兼容性
- 动态导入 Prisma 客户端避免构建时依赖

#### 连接管理
- 自动管理数据库连接
- 使用完毕后正确断开连接

## 使用方法

### 配置缓存

```typescript
import { getConfig, getAllConfigs } from '@/lib/server/configCache'

// 获取单个配置项
const config = await getConfig('site_name')

// 获取所有配置项
const allConfigs = await getAllConfigs()
```

### 菜单缓存

```typescript
import {
  getMenus,
  getMenusByCategory,
  getActiveMenus,
  getActiveMenusByCategory
} from '@/lib/server/menuCache'

// 获取所有菜单
const allMenus = await getMenus()

// 按分类获取菜单
const mainMenus = await getMenusByCategory('MAIN')

// 获取活跃菜单
const activeMenus = await getActiveMenus()

// 按分类获取活跃菜单
const activeMainMenus = await getActiveMenusByCategory('MAIN')
```

## 缓存文件格式

### 配置缓存格式
```json
{
  "site_name": {
    "key": "site_name",
    "value": "NeutralPress",
    "description": "网站名称",
    "updatedAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### 菜单缓存格式
```json
[
  {
    "id": "menu-id",
    "name": "首页",
    "icon": "home",
    "link": "/",
    "slug": "home",
    "status": "ACTIVE",
    "order": 0,
    "category": "MAIN",
    "createdAt": "2025-01-01T00:00:00.000Z",
    "updatedAt": "2025-01-01T00:00:00.000Z",
    "page": {
      "id": "page-id",
      "title": "首页",
      "slug": "home",
      "content": {},
      "status": "ACTIVE",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "isDefault": true
    }
  }
]
```

## 性能优化

### 查询优化
- 菜单查询包含关联的页面数据，避免 N+1 查询
- 使用适当的数据库索引
- 按分类和顺序排序，提升前端渲染效率

### 缓存策略
- 生产环境完全依赖缓存，零数据库查询
- 开发环境直连数据库，保证数据实时性
- 构建时生成缓存，运行时只读操作

### 内存管理
- 缓存读取后正确处理日期对象转换
- 避免内存泄漏，及时清理资源
- 使用流式处理大缓存文件

## 最佳实践

### 1. 缓存更新
- 数据变更后需要重新构建项目
- 在 CI/CD 流程中包含缓存生成步骤
- 定期检查缓存文件的完整性

### 2. 错误处理
- 缓存文件不存在时优雅降级到数据库
- 记录缓存读取失败的详细日志
- 提供缓存重建的应急方案

### 3. 监控和维护
- 监控缓存文件大小和生成时间
- 定期清理过期的缓存文件
- 建立缓存健康检查机制

## 扩展性

缓存系统设计具有良好的扩展性：

1. **新增缓存类型**: 可以轻松添加其他数据类型的缓存
2. **缓存策略**: 支持不同的缓存失效和更新策略
3. **存储后端**: 可以扩展支持 Redis 等其他存储后端
4. **缓存分析**: 可以添加缓存命中率和性能监控

缓存系统是 NeutralPress 性能优化的重要组成部分，通过合理使用缓存，可以显著提升应用性能和用户体验。