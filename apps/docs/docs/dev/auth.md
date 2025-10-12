---
sidebar_position: 5
tags:
  - dev
  - auth
---

# 认证系统

NeutralPress 使用基于 JWT 的双令牌认证系统，结合 HttpOnly Cookie，确保安全性和用户体验。

具体来说，当登陆成功后，会下发两个令牌：`access_token` 和 `refresh_token` ，以 HttpOnly Cookie 的形式存储在浏览器中。默认情况下，`access_token` 有效期为 10 分钟，`refresh_token` 有效期为 30 天。

## 登录

登录后，将会创建一个名为 `user_info` 的 localStorage，用于存储用户信息。内容如下：

```json
{
  "uid": 1,
  "username": "username",
  "nickname": "nickname",
  "exp": "2025-11-11T06:39:48.803Z",
  "lastRefresh": "2025-10-11T06:39:48.803Z"
}
```

此 localStorage 将在退出账号或检测到 `refresh_token` 已吊销或过期时被删除。

## 刷新

主要的刷新逻辑为：

- 打开页面时，如果 `user_info` 存在且未过期，且 `lastRefresh` 在10分钟之前，则自动尝试刷新 `access_token` 。如果存在但已过期，弹窗提示。
- 使用 `lib/client/fetchWithAuth.ts` 中的 `fetchWithAuth` 方法发起请求，在 `access_token` 过期时，自动使用 `refresh_token` 刷新 `access_token`。

刷新时，会更新`lastRefresh` 字段。
