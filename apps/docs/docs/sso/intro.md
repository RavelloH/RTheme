# SSO 单点登录配置

SSO（Single Sign-On，单点登录）允许用户使用第三方账户（如 Google、GitHub、Microsoft）登录您的网站，提供更便捷的登录体验。

## 支持的 SSO 提供商

NeutralPress 目前支持以下三个 SSO 提供商：

- **Google OAuth 2.0** - 使用 Google 账户登录
- **GitHub OAuth** - 使用 GitHub 账户登录
- **Microsoft** - 使用 Microsoft 账户登录

## 配置概览

每个 SSO 提供商都需要两个步骤：

1. **在提供商平台创建 OAuth 应用**：获取 Client ID 和 Client Secret
2. **在 NeutralPress 配置**：将获取的凭证填入系统设置

## 配置项说明

在系统设置中，每个 SSO 提供商都有以下配置：

### 开关配置

- `user.sso.google.enabled` - 是否启用 Google SSO
- `user.sso.github.enabled` - 是否启用 GitHub SSO
- `user.sso.microsoft.enabled` - 是否启用 Microsoft SSO

### OAuth 参数配置

所有 SSO 提供商都使用相同的配置格式：

```json
{
  "clientId": "你的 Client ID",
  "clientSecret": "你的 Client Secret"
}
```

## 回调 URL

配置 OAuth 应用时，需要设置回调 URL（Redirect URI）为：

```
https://你的域名/sso/{provider}/callback
```

其中 `{provider}` 为：

- Google: `google`
- GitHub: `github`
- Microsoft: `microsoft`

示例：

- `https://example.com/sso/google/callback`
- `https://example.com/sso/github/callback`
- `https://example.com/sso/microsoft/callback`

## 安全说明

:::warning 安全提示

- Client Secret、Private Key 等敏感信息会以**明文形式**存储在数据库中
- 请确保数据库访问权限受到严格控制
- 建议使用专用的 OAuth 应用，不要与其他服务共用
- 定期轮换 Client Secret
  :::

## 下一步

选择您要配置的 SSO 提供商：

- [Google OAuth 配置指南](./google.md)
- [GitHub OAuth 配置指南](./github.md)
- [Microsoft OAuth 配置指南](./microsoft.md)
