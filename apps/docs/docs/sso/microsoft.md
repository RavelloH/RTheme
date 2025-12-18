# Microsoft OAuth 配置指南

本文档介绍如何为 NeutralPress 配置 Microsoft OAuth 登录。

## 前置要求

- 一个 Microsoft 账户（个人账户或工作/学校账户均可）
- 访问 [Microsoft Entra 管理中心](https://entra.microsoft.com/)（原 Azure AD）

## 配置步骤

### 1. 创建应用注册

1. 登录到 [Microsoft Entra 管理中心](https://entra.microsoft.com/)
2. 在左侧菜单中选择 **应用程序** > **应用注册**
3. 点击 **新注册** 按钮
4. 填写应用信息：
   - **名称**：填写您的应用名称（例如：NeutralPress）
   - **支持的账户类型**：选择 "任何组织目录中的帐户和个人 Microsoft 帐户"
   - **重定向 URI**：选择 "Web"，填写 `https://your-domain.com/sso/microsoft/callback`
5. 点击 **注册**

### 2. 配置应用

#### 2.1 获取客户端信息

注册完成后，您会看到应用的概述页面：

1. 复制 **应用程序（客户端）ID**，这将作为 `clientId`
2. 在左侧菜单中选择 **证书和密码**
3. 点击 **新客户端密码**
4. 添加说明（例如：NeutralPress Secret）
5. 选择过期时间（建议选择 24 个月）
6. 点击 **添加**
7. **立即复制**生成的密码值，这将作为 `clientSecret`（密码值只显示一次）

#### 2.2 配置 API 权限

1. 在左侧菜单中选择 **API 权限**
2. 默认已添加 `User.Read` 权限
3. 确保以下权限已添加（如果没有，点击 **添加权限** 添加）：
   - `openid`
   - `profile`
   - `email`
4. 这些是委托权限（Delegated permissions），无需管理员同意

### 3. 在 NeutralPress 中配置

1. 登录到 NeutralPress 管理后台
2. 进入 **设置** > **SSO 登录**
3. 找到 **Microsoft** 配置项
4. 填入以下信息：
   - **Client ID**：步骤 2.1 中复制的应用程序（客户端）ID
   - **Client Secret**：步骤 2.1 中复制的客户端密码
5. 启用 Microsoft SSO 登录
6. 保存设置

### 4. 测试登录

1. 退出登录（如果已登录）
2. 在登录页面点击 **使用 Microsoft 登录** 按钮
3. 您将被重定向到 Microsoft 登录页面
4. 使用您的 Microsoft 账户登录
5. 首次登录时，系统会要求您授权应用访问您的基本信息
6. 授权后，您将被重定向回 NeutralPress 并自动登录

## 回调 URL 配置

确保在 Microsoft 应用注册中配置的重定向 URI 与您的实际域名匹配：

- **开发环境**：`http://localhost:3000/sso/microsoft/callback`
- **生产环境**：`https://your-domain.com/sso/microsoft/callback`

## 常见问题

### 1. 登录时提示 "redirect_uri_mismatch" 错误

这表示回调 URL 配置不正确。请检查：

- Microsoft 应用注册中的重定向 URI 是否与实际使用的 URL 完全匹配
- 注意 `http` vs `https` 的区别
- 确保 URL 末尾没有多余的斜杠

### 2. 登录时提示 "invalid_client" 错误

这表示客户端凭据配置不正确。请检查：

- Client ID 是否正确复制
- Client Secret 是否正确复制且未过期
- Client Secret 是否在创建后立即复制（只显示一次）

### 3. 无法获取用户邮箱

Microsoft 账户可能使用 `userPrincipalName` 而不是 `mail` 字段。NeutralPress 会自动处理这种情况。

### 4. 企业账户登录问题

如果您的组织启用了多因素认证（MFA）或条件访问策略，用户在登录时需要完成额外的验证步骤。这是正常的安全流程。

## 支持的账户类型

Microsoft OAuth 支持以下类型的账户：

- **个人 Microsoft 账户**（@outlook.com、@hotmail.com、@live.com 等）
- **工作或学校账户**（Azure AD / Microsoft Entra ID 账户）
- **Xbox Live 账户**

## 安全建议

1. **定期轮换密码**：建议每 6-12 个月更新一次客户端密码
2. **限制重定向 URI**：只添加实际使用的重定向 URI，不要使用通配符
3. **使用 HTTPS**：生产环境必须使用 HTTPS
4. **保护密码**：妥善保管客户端密码，不要提交到版本控制系统

## 相关链接

- [Microsoft 身份平台文档](https://learn.microsoft.com/zh-cn/entra/identity-platform/)
- [应用注册快速入门](https://learn.microsoft.com/zh-cn/entra/identity-platform/quickstart-register-app)
- [Microsoft Graph API](https://learn.microsoft.com/zh-cn/graph/overview)
