# Google OAuth 配置指南

本指南将帮助您获取 Google OAuth 2.0 的 Client ID 和 Client Secret。

## 前置要求

- 一个 Google 账户
- 访问 [Google Cloud Console](https://console.cloud.google.com/)

## 步骤 1：创建项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击顶部导航栏的项目选择器
3. 点击「新建项目」
4. 输入项目名称（例如：NeutralPress SSO）
5. 点击「创建」

## 步骤 2：启用 Google+ API

1. 在左侧菜单中，选择「API 和服务」→「库」
2. 搜索「Google+ API」
3. 点击「Google+ API」
4. 点击「启用」按钮

:::info
虽然 Google+ 已经关闭，但 OAuth 仍然需要启用此 API 来获取用户基本信息。
:::

## 步骤 3：配置 OAuth 同意屏幕

1. 在左侧菜单中，选择「API 和服务」→「OAuth 同意屏幕」
2. 选择用户类型：
   - **外部**：任何 Google 账户都可以登录（推荐）
   - **内部**：仅限您的 Google Workspace 组织内的用户
3. 点击「创建」
4. 填写应用信息：
   - **应用名称**：您的网站名称
   - **用户支持电子邮件**：您的邮箱
   - **应用徽标**（可选）：网站 logo
   - **应用首页**：您的网站首页 URL
   - **授权域**：您的域名（例如：example.com）
   - **开发者联系信息**：您的邮箱
5. 点击「保存并继续」
6. 作用域配置（Scopes）：
   - 点击「添加或移除作用域」
   - 选择以下作用域：
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - 点击「更新」
7. 点击「保存并继续」
8. 测试用户（如果选择了「外部」类型）：
   - 在开发阶段可以添加测试用户
   - 正式发布前需要提交审核
9. 点击「保存并继续」，完成配置

## 步骤 4：创建 OAuth 客户端 ID

1. 在左侧菜单中，选择「API 和服务」→「凭据」
2. 点击「创建凭据」→「OAuth 客户端 ID」
3. 应用类型选择「Web 应用」
4. 填写信息：
   - **名称**：例如 "NeutralPress Web Client"
   - **已获授权的 JavaScript 来源**：
     ```
     https://你的域名
     ```
   - **已获授权的重定向 URI**：
     ```
     https://你的域名/sso/google/callback
     ```
5. 点击「创建」

## 步骤 5：获取凭证

创建成功后，会弹出对话框显示：

- **客户端 ID**（Client ID）：形如 `xxxxx.apps.googleusercontent.com`
- **客户端密钥**（Client Secret）：形如 `GOCSPX-xxxxx`

:::warning 重要
请妥善保存这些凭证，特别是 Client Secret。如果丢失，需要重新生成。
:::

## 步骤 6：在 NeutralPress 中配置

1. 登录 NeutralPress 管理后台
2. 进入「系统设置」
3. 找到「SSO 配置」部分
4. 启用 Google SSO：
   - 将 `user.sso.google.enabled` 设置为 `true`
5. 配置 Google OAuth 参数 `user.sso.google`：
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
3. 应该能看到「使用 Google 登录」按钮
4. 点击按钮测试登录流程

## 常见问题

### 错误：redirect_uri_mismatch

**原因**：回调 URL 配置不匹配

**解决方法**：

- 检查 Google Cloud Console 中的「已获授权的重定向 URI」
- 确保与 `https://你的域名/sso/google/callback` 完全一致
- 注意 HTTP 和 HTTPS 的区别
- 注意是否有多余的尾部斜杠

### 错误：access_denied

**原因**：用户取消授权或应用未通过审核

**解决方法**：

- 如果是测试阶段，确保已将测试用户添加到测试用户列表
- 如果是生产环境，需要提交应用审核

### 应用审核

如果您选择了「外部」用户类型，应用默认处于「测试」状态，只有测试用户可以登录。要允许所有用户登录，需要：

1. 在 OAuth 同意屏幕页面，点击「发布应用」
2. Google 会审核您的应用
3. 审核通过后，所有 Google 用户都可以使用

:::info
对于个人网站或小型项目，保持「测试」状态并添加需要的用户即可。
:::

## 进一步阅读

- [Google OAuth 2.0 官方文档](https://developers.google.com/identity/protocols/oauth2)
- [OAuth 同意屏幕配置](https://support.google.com/cloud/answer/10311615)
