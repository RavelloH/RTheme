# GitHub OAuth 配置指南

本指南将帮助您获取 GitHub OAuth App 的 Client ID 和 Client Secret。

## 前置要求

- 一个 GitHub 账户
- 访问 [GitHub 开发者设置](https://github.com/settings/developers)

## 步骤 1：创建 OAuth App

1. 访问 [GitHub 开发者设置](https://github.com/settings/developers)
2. 点击「OAuth Apps」标签
3. 点击「New OAuth App」按钮
4. 填写应用信息：
   - **Application name**：您的应用名称（例如：NeutralPress）
   - **Homepage URL**：您的网站首页 URL
     ```
     https://你的域名
     ```
   - **Application description**（可选）：应用描述
   - **Authorization callback URL**：OAuth 回调 URL
     ```
     https://你的域名/sso/github/callback
     ```
5. 点击「Register application」

:::info
GitHub OAuth App 和 GitHub App 是不同的。请确保创建的是 OAuth App。
:::

## 步骤 2：获取凭证

创建成功后，您会看到：

- **Client ID**：形如 `Iv1.xxxxxxxxxxxxxxxx`
- **Client secrets**：点击「Generate a new client secret」生成

:::warning 重要提示

- Client Secret 只会显示一次，请立即复制保存
- 如果丢失，需要重新生成新的 Secret
- 生成新 Secret 后，旧的 Secret 会立即失效
  :::

## 步骤 3：在 NeutralPress 中配置

1. 登录 NeutralPress 管理后台
2. 进入「系统设置」
3. 找到「SSO 配置」部分
4. 启用 GitHub SSO：
   - 将 `user.sso.github.enabled` 设置为 `true`
5. 配置 GitHub OAuth 参数 `user.sso.github`：
   ```json
   {
     "clientId": "你的 Client ID",
     "clientSecret": "你的 Client Secret"
   }
   ```
6. 保存设置

## 验证配置

1. 退出登录（如果已登录）
2. 访问登录页面
3. 应该能看到「使用 GitHub 登录」按钮
4. 点击按钮测试登录流程

## 权限说明

GitHub OAuth 会请求以下权限：

- **user:email**：读取用户的邮箱地址（用于创建和匹配账户）
- **基本信息**：用户名、头像等公开信息

这些是最小必需权限，不会访问用户的仓库或其他敏感信息。

## 常见问题

### 错误：redirect_uri_mismatch

**原因**：回调 URL 配置不匹配

**解决方法**：

1. 访问您的 [OAuth Apps 设置](https://github.com/settings/developers)
2. 点击您的应用
3. 检查「Authorization callback URL」
4. 确保与 `https://你的域名/sso/github/callback` 完全一致
5. 点击「Update application」保存

### 错误：用户没有公开邮箱

**原因**：部分 GitHub 用户设置了邮箱为私密

**解决方法**：

- NeutralPress 会尝试获取用户的主邮箱（包括私密邮箱）
- 如果无法获取邮箱，登录会失败
- 建议用户在 GitHub 设置中至少设置一个邮箱为公开，或允许应用访问私密邮箱

### 本地开发测试

如果您在本地开发环境测试（如 `http://localhost:3000`），需要：

1. 创建一个单独的 OAuth App 用于开发
2. 将 Homepage URL 和 Callback URL 设置为本地地址：
   - Homepage URL: `http://localhost:3000`
   - Callback URL: `http://localhost:3000/sso/github/callback`

:::warning
不要在生产环境使用本地开发的 OAuth App 凭证。
:::

## GitHub App vs OAuth App

### OAuth App（推荐用于用户登录）

- ✅ 适合用户认证和登录
- ✅ 配置简单
- ✅ 权限请求明确
- ❌ 功能相对有限

### GitHub App（适合集成 GitHub 功能）

- ✅ 更细粒度的权限控制
- ✅ 可以作为 GitHub App 安装到仓库
- ✅ 支持 Webhooks
- ❌ 配置复杂
- ❌ 用于登录场景过于复杂

**结论**：对于 SSO 登录，使用 OAuth App 即可。

## 安全建议

1. **定期轮换 Client Secret**
   - 建议每 6-12 个月更换一次
   - 在「OAuth Apps」设置页面重新生成

2. **监控授权列表**
   - 定期检查哪些用户授权了您的应用
   - 在应用设置页面可以看到授权统计

3. **限制回调 URL**
   - 只配置实际使用的回调 URL
   - 不要使用通配符或过于宽泛的 URL

## 撤销用户授权

用户可以随时撤销授权：

1. 访问 [GitHub 授权应用列表](https://github.com/settings/applications)
2. 找到您的应用
3. 点击「Revoke」撤销授权

撤销后，用户下次登录需要重新授权。

## 进一步阅读

- [GitHub OAuth Apps 官方文档](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [授权 OAuth 应用](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [OAuth Apps 最佳实践](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/best-practices-for-oauth-apps)
