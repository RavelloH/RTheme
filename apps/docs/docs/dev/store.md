---
sidebar_position: 1
title: Store 状态管理
description: NeutralPress 的状态管理工具使用指南
---

# Store 状态管理

NeutralPress 提供了三个基于 Zustand 的状态管理工具，用于处理组件间的通信、事件管理和函数注册。所有工具都经过优化，具备内存泄漏防护和完整的类型安全。

## 安装依赖

项目已内置 Zustand，无需额外安装。

## useBroadcast - 广播消息系统

用于全局消息广播，支持泛型类型安全和自动内存清理。

### 基础用法

```typescript
import { useBroadcast, useBroadcastListener } from '@/hook/useBroadcast';

// 获取广播实例
const broadcast = useBroadcast<string>();

// 注册回调（需要 ID）
const id = Symbol('callback');
broadcast.registerCallback(id, (message: string) => {
  console.log('收到消息:', message);
});

// 广播消息（支持异步）
await broadcast.broadcast('Hello World');

// 取消注册
broadcast.unregisterCallback(id);

// 获取当前回调数量
console.log('当前回调数量:', broadcast.getCallbackCount());
```

### React Hook 用法（推荐）

使用 `useBroadcastListener` Hook 实现自动清理：

```typescript
import { useBroadcast, useBroadcastListener } from '@/hook/useBroadcast';

function MyComponent() {
  const broadcast = useBroadcast<string>();

  // 自动注册和清理
  useBroadcastListener(broadcast, (message: string) => {
    console.log('收到消息:', message);
  });

  // 发送消息
  const sendMessage = () => {
    broadcast.broadcast('Hello from Component');
  };

  return <button onClick={sendMessage}>发送消息</button>;
}
```

### 异步支持

所有回调都支持异步操作：

```typescript
useBroadcastListener(broadcast, async (message: string) => {
  // 模拟异步操作
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('异步处理消息:', message);
});

// 广播时会等待所有回调完成
await broadcast.broadcast('异步消息');
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

userBroadcast.registerCallback(Symbol('user-callback'), (message) => {
  if (message.type === 'user_update') {
    console.log('用户更新:', message.userId);
  }
});
```

## useEvent - 事件监听系统

提供发布订阅模式的事件管理，支持事件名和参数的类型安全，具备自动内存清理机制。

### 基础用法

```typescript
import { useEvent, useEventListener } from '@/hook/useEvent';

// 定义事件映射
interface AppEvents {
  'user:login': (userId: number, userData: any) => void;
  'user:logout': (userId: number) => void;
  'notification:show': (message: string, type: 'success' | 'error') => void;
}

const eventManager = useEvent<AppEvents>();

// 监听事件（需要 ID）
const id = Symbol('login-handler');
eventManager.on('user:login', id, (userId, userData) => {
  console.log('用户登录:', userId, userData);
});

// 触发事件（支持异步）
await eventManager.emit('user:login', 123, { name: '张三' });

// 取消监听
eventManager.off('user:login', id);

// 获取监听器数量
console.log('登录事件监听器数量:', eventManager.getListenerCount('user:login'));

// 获取所有事件名
console.log('当前事件:', eventManager.getEventNames());
```

### React Hook 用法（推荐）

使用 `useEventListener` Hook 实现自动清理：

```typescript
import { useEvent, useEventListener } from '@/hook/useEvent';

function LoginComponent() {
  const eventManager = useEvent<AppEvents>();

  // 自动监听和清理
  useEventListener(eventManager, 'user:login', (userId, userData) => {
    console.log('用户登录:', userId, userData);
  });

  // 触发登录事件
  const handleLogin = () => {
    eventManager.emit('user:login', 123, { name: '张三' });
  };

  return <button onClick={handleLogin}>模拟登录</button>;
}
```

### 异步支持

所有事件监听器都支持异步操作：

```typescript
useEventListener(eventManager, 'user:login', async (userId, userData) => {
  // 模拟异步处理
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('异步处理用户登录:', userId);
});

// 触发事件时会等待所有监听器完成
await eventManager.emit('user:login', 123, { name: '张三' });
```

### 事件类型安全

TypeScript 会自动检查事件名和参数类型的匹配：

```typescript
// ✅ 正确
await eventManager.emit('user:login', 123, { name: '张三' });

// ❌ 错误：参数数量不匹配
await eventManager.emit('user:login', 123);

// ❌ 错误：事件名不存在
await eventManager.emit('unknown:event', 'data');
```

## useFunction - 函数注册系统

用于动态注册和调用函数，支持插件化开发，具备完整的错误处理和类型安全。

### 基础用法

```typescript
import { useFunction, FunctionNotFoundError, FunctionExecutionError } from '@/hook/useFunction';

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

// 调用函数（异步）
try {
  const formattedDate = await functionManager.callFunction('utils:formatDate', new Date(), 'YYYY-MM-DD');
  const isValid = await functionManager.callFunction('utils:validate', 'hello');
  console.log('格式化日期:', formattedDate);
  console.log('验证结果:', isValid);
} catch (error) {
  if (error instanceof FunctionNotFoundError) {
    console.error('函数未找到:', error.message);
  } else if (error instanceof FunctionExecutionError) {
    console.error('函数执行失败:', error.message);
  }
}

// 同步调用
try {
  const result = functionManager.callFunctionSync('utils:validate', 'hello');
  console.log('同步调用结果:', result);
} catch (error) {
  console.error('同步调用失败:', error);
}

// 检查函数是否存在
if (functionManager.hasFunction('utils:formatDate')) {
  // 函数存在，可以安全调用
}

// 获取函数信息
console.log('已注册函数数量:', functionManager.getFunctionCount());
console.log('已注册函数名:', functionManager.getFunctionNames());

// 注销函数
functionManager.unregisterFunction('utils:formatDate');
```

### 异步函数支持

```typescript
// 注册异步函数
functionManager.registerFunction('api:fetch', async (url) => {
  const response = await fetch(url);
  return response.json();
});

// 调用异步函数（自动处理 Promise）
const data = await functionManager.callFunction('api:fetch', '/api/users');
console.log('API 数据:', data);

// 混合同步和异步调用
functionManager.registerFunction('utils:process', async (data: string) => {
  // 同步操作
  const cleaned = data.trim();
  // 异步操作
  await new Promise(resolve => setTimeout(resolve, 100));
  return cleaned.toUpperCase();
});

const result = await functionManager.callFunction('utils:process', '  hello  ');
console.log('处理结果:', result); // "HELLO"
```

### 错误处理增强

```typescript
// 自定义错误处理
try {
  const result = await functionManager.callFunction('nonexistent:func');
} catch (error) {
  if (error instanceof FunctionNotFoundError) {
    // 处理函数未找到错误
    console.error('函数不存在:', error.message);
  } else if (error instanceof FunctionExecutionError) {
    // 处理函数执行错误，可以访问原始错误
    console.error('函数执行失败:', error.message);
    console.error('原始错误:', error.cause);
  }
}

// 函数执行错误示例
functionManager.registerFunction('utils:risky', (value: string) => {
  if (value === 'error') {
    throw new Error('故意抛出的错误');
  }
  return value;
});

try {
  await functionManager.callFunction('utils:risky', 'error');
} catch (error) {
  console.error('捕获到函数执行错误:', error instanceof FunctionExecutionError); // true
  console.error('原始错误:', error.cause); // 原始的 Error 对象
}
```

## 最佳实践

### 1. 类型定义

建议为每个 store 定义明确的接口类型：

```typescript
// types/events.ts
export interface AppEvents {
  'user:login': (userId: number, userData: any) => void;
  'user:logout': (userId: number) => void;
  'notification:show': (message: string, type: 'success' | 'error') => void;
}

// types/functions.ts
export interface AppFunctions {
  'utils:formatDate': (date: Date, format: string) => string;
  'utils:validate': (value: string) => boolean;
  'api:fetch': (url: string) => Promise<any>;
}

// types/broadcast.ts
export interface BroadcastMessages {
  'user:update': { userId: number; data: any };
  'system:notification': { message: string; type: string };
}
```

### 2. 内存管理（已优化）

现在使用 React Hooks 自动处理内存清理：

```typescript
import { useBroadcastListener, useEventListener } from '@/hook';

function MyComponent() {
  const broadcast = useBroadcast<BroadcastMessages>();
  const eventManager = useEvent<AppEvents>();

  // 自动清理的广播监听
  useBroadcastListener(broadcast, (message) => {
    console.log('收到广播消息:', message);
  });

  // 自动清理的事件监听
  useEventListener(eventManager, 'user:login', (userId, userData) => {
    console.log('用户登录:', userId);
  });

  return <div>组件内容</div>;
}
```

### 3. 错误处理增强

```typescript
import { FunctionNotFoundError, FunctionExecutionError } from '@/hook/useFunction';

async function safeFunctionCall() {
  try {
    const result = await functionManager.callFunction('utils:formatDate', new Date(), 'YYYY-MM-DD');
    return result;
  } catch (error) {
    if (error instanceof FunctionNotFoundError) {
      console.warn('函数未注册，使用默认值');
      return new Date().toLocaleDateString();
    } else if (error instanceof FunctionExecutionError) {
      console.error('函数执行失败:', error.cause);
      throw error;
    }
  }
}
```

### 4. 单例模式

在应用级别创建单例实例：

```typescript
// stores/index.ts
import { useBroadcast, useEvent, useFunction } from '@/hook';
import type { AppEvents, AppFunctions, BroadcastMessages } from '@/types';

export const appBroadcast = useBroadcast<BroadcastMessages>();
export const appEvents = useEvent<AppEvents>();
export const appFunctions = useFunction<AppFunctions>();

// 在应用初始化时注册常用函数
appFunctions.registerFunction('utils:formatDate', (date, format) => {
  return date.toLocaleDateString('zh-CN');
});
```

### 5. 性能优化

```typescript
// 使用 useCallback 避免不必要的重新渲染
import { useCallback } from 'react';

function OptimizedComponent() {
  const broadcast = useBroadcast<string>();

  const handleMessage = useCallback((message: string) => {
    console.log('处理消息:', message);
  }, []);

  useBroadcastListener(broadcast, handleMessage);

  return <div>优化组件</div>;
}
```

## 性能考虑

1. **使用 React Hooks**: 推荐使用 `useBroadcastListener` 和 `useEventListener`，它们自动处理内存清理
2. **避免频繁注册/注销**: 在组件生命周期内尽量保持稳定的监听器
3. **使用 useCallback**: 对于复杂的回调函数，使用 `useCallback` 避免不必要的重新渲染
4. **异步操作优化**: 对于耗时的异步操作，考虑使用防抖或节流
5. **监控资源使用**: 使用 `getCallbackCount()`、`getListenerCount()` 等方法监控资源使用情况

## 调试工具

### 状态监控

```typescript
// 监控广播系统状态
const broadcast = useBroadcast<string>();
console.log('当前回调数量:', broadcast.getCallbackCount());

// 监控事件系统状态
const eventManager = useEvent<AppEvents>();
console.log('当前事件:', eventManager.getEventNames());
console.log('登录事件监听器数量:', eventManager.getListenerCount('user:login'));

// 监控函数系统状态
const functionManager = useFunction<AppFunctions>();
console.log('已注册函数数量:', functionManager.getFunctionCount());
console.log('已注册函数名:', functionManager.getFunctionNames());
```

### Zustand DevTools

Zustand 内置了 Redux DevTools 支持，可以在浏览器开发者工具中查看状态变化：

```typescript
// 开发环境自动启用 DevTools
// 生产环境可以通过环境变量控制
const broadcast = useBroadcast<string>();
```

## 常见问题

### Q: 为什么使用 Zustand 而不是 Redux？

A: Zustand 更轻量级，API 更简洁，TypeScript 支持更好，适合中小型项目的状态管理需求。优化后的工具提供了更好的内存管理和类型安全。

### Q: 新版本有什么重大变化？

A: 主要变化包括：
- **内存管理**: 现在使用 React Hooks 自动清理，避免内存泄漏
- **类型安全**: 增强的 TypeScript 类型推断和错误处理
- **异步支持**: 所有操作都支持 Promise 和异步处理
- **API 变化**: 注册回调现在需要 Symbol ID，提供了自动清理的 Hooks

### Q: 如何从旧版本迁移？

A: 迁移步骤：
1. 将 `registerCallback(callback)` 改为 `registerCallback(id, callback)`
2. 将 `on(eventName, listener)` 改为 `on(eventName, id, listener)`
3. 使用 `useBroadcastListener` 和 `useEventListener` 替代手动清理
4. 将 `callFunction` 改为异步调用 `await callFunction()`

### Q: 如何在服务端渲染 (SSR) 中使用？

A: Zustand 支持 SSR，但需要注意在服务端和客户端状态同步的问题。建议在客户端使用这些工具。

### Q: 如何处理状态持久化？

A: 可以使用 Zustand 的 persist 中间件或手动实现本地存储逻辑。

### Q: 如何处理大量的回调函数？

A: 对于大量回调，建议：
- 使用单例模式在应用级别管理
- 定期清理不需要的回调
- 使用监控工具跟踪回调数量
- 考虑使用事件名称空间避免冲突

## 相关链接

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [TypeScript 泛型指南](https://www.typescriptlang.org/docs/handbook/generics.html)
- [React Hooks 最佳实践](https://react.dev/learn/writing-components-with-hooks)