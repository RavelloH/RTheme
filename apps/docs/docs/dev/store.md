---
sidebar_position: 1
title: Store 状态管理
description: NeutralPress 的状态管理工具使用指南
---

# Store 状态管理

NeutralPress 提供了三个基于 Zustand 的状态管理工具，用于处理组件间的通信、事件管理和函数注册。

## 安装依赖

项目已内置 Zustand，无需额外安装。

## useBroadcast - 广播消息系统

用于全局消息广播，支持泛型类型安全。

### 基础用法

```typescript
import { useBroadcast } from '@/store/useBroadcast';

// 获取广播实例
const broadcast = useBroadcast<string>();

// 注册回调
const callback = (message: string) => {
  console.log('收到消息:', message);
};
broadcast.registerCallback(callback);

// 广播消息
broadcast.broadcast('Hello World');

// 取消注册
broadcast.unregisterCallback(callback);
```

### 泛型支持

```typescript
// 定义消息类型
interface UserMessage {
  type: 'user_update';
  userId: number;
  data: any;
}

const userBroadcast = useBroadcast<UserMessage>();

userBroadcast.registerCallback((message) => {
  if (message.type === 'user_update') {
    console.log('用户更新:', message.userId);
  }
});
```

## useEvent - 事件监听系统

提供发布订阅模式的事件管理，支持事件名和参数的类型安全。

### 基础用法

```typescript
import { useEvent } from '@/store/useEvent';

// 定义事件映射
interface AppEvents {
  'user:login': (userId: number, userData: any) => void;
  'user:logout': (userId: number) => void;
  'notification:show': (message: string, type: 'success' | 'error') => void;
}

const eventManager = useEvent<AppEvents>();

// 监听事件
eventManager.on('user:login', (userId, userData) => {
  console.log('用户登录:', userId, userData);
});

// 触发事件
eventManager.emit('user:login', 123, { name: '张三' });

// 取消监听
const handler = (userId: number) => console.log('用户登出:', userId);
eventManager.on('user:logout', handler);
eventManager.off('user:logout', handler);
```

### 事件类型安全

TypeScript 会自动检查事件名和参数类型的匹配：

```typescript
// ✅ 正确
eventManager.emit('user:login', 123, { name: '张三' });

// ❌ 错误：参数数量不匹配
eventManager.emit('user:login', 123);

// ❌ 错误：事件名不存在
eventManager.emit('unknown:event', 'data');
```

## useFunction - 函数注册系统

用于动态注册和调用函数，支持插件化开发。

### 基础用法

```typescript
import { useFunction } from '@/store/useFunction';

// 定义函数映射
interface AppFunctions {
  'utils:formatDate': (date: Date, format: string) => string;
  'utils:validate': (value: string) => boolean;
  'api:fetch': (url: string) => Promise<any>;
}

const functionManager = useFunction<AppFunctions>();

// 注册函数
functionManager.registerFunction('utils:formatDate', (date, format) => {
  return date.toLocaleDateString('zh-CN');
});

functionManager.registerFunction('utils:validate', (value) => {
  return value.length > 0;
});

// 调用函数
const formattedDate = functionManager.callFunction('utils:formatDate', new Date(), 'YYYY-MM-DD');
const isValid = functionManager.callFunction('utils:validate', 'hello');

// 检查函数是否存在
if (functionManager.hasFunction('utils:formatDate')) {
  // 函数存在，可以安全调用
}
```

### 异步函数支持

```typescript
// 注册异步函数
functionManager.registerFunction('api:fetch', async (url) => {
  const response = await fetch(url);
  return response.json();
});

// 调用异步函数
const data = await functionManager.callFunction('api:fetch', '/api/users');
```

## 最佳实践

### 1. 类型定义

建议为每个 store 定义明确的接口类型：

```typescript
// events.ts
export interface AppEvents {
  'user:login': (userId: number, userData: any) => void;
  'user:logout': (userId: number) => void;
  'notification:show': (message: string, type: 'success' | 'error') => void;
}

// functions.ts
export interface AppFunctions {
  'utils:formatDate': (date: Date, format: string) => string;
  'utils:validate': (value: string) => boolean;
  'api:fetch': (url: string) => Promise<any>;
}
```

### 2. 内存管理

在组件卸载时记得清理资源：

```typescript
import { useEffect } from 'react';
import { useEvent } from '@/store/useEvent';

function MyComponent() {
  const eventManager = useEvent<AppEvents>();

  useEffect(() => {
    const handler = (message: string) => console.log(message);
    eventManager.on('notification:show', handler);

    // 组件卸载时清理
    return () => {
      eventManager.off('notification:show', handler);
    };
  }, [eventManager]);

  return <div>组件内容</div>;
}
```

### 3. 错误处理

```typescript
try {
  const result = functionManager.callFunction('utils:formatDate', new Date(), 'YYYY-MM-DD');
  console.log('格式化结果:', result);
} catch (error) {
  console.error('函数调用失败:', error);
}
```

## 性能考虑

1. **避免频繁注册/注销**: 在组件生命周期内尽量保持稳定的监听器
2. **使用选择器**: 如果只需要部分状态，使用 Zustand 的选择器优化
3. **清理资源**: 组件卸载时及时清理回调函数和事件监听器

## 调试工具

Zustand 内置了 Redux DevTools 支持，可以在浏览器开发者工具中查看状态变化：

```typescript
// 开发环境自动启用 DevTools
// 生产环境可以通过环境变量控制
const broadcast = useBroadcast<string>();
```

## 常见问题

### Q: 为什么使用 Zustand 而不是 Redux？

A: Zustand 更轻量级，API 更简洁，TypeScript 支持更好，适合中小型项目的状态管理需求。

### Q: 如何在服务端渲染 (SSR) 中使用？

A: Zustand 支持 SSR，但需要注意在服务端和客户端状态同步的问题。

### Q: 如何处理状态持久化？

A: 可以使用 Zustand 的 persist 中间件或手动实现本地存储逻辑。

## 相关链接

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [TypeScript 泛型指南](https://www.typescriptlang.org/docs/handbook/generics.html)
- [React Hooks 最佳实践](https://react.dev/learn/writing-components-with-hooks)