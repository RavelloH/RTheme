/**
 * OAuth 工具库
 * 使用 arctic 库处理 Google、GitHub、Microsoft 的 OAuth 2.0 流程
 */

import { Google, GitHub, MicrosoftEntraId, generateCodeVerifier } from "arctic";
import { getConfig } from "@/lib/server/configCache";

export type OAuthProvider = "google" | "github" | "microsoft";

/**
 * OAuth 用户信息接口
 */
export interface OAuthUserInfo {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  name?: string;
  avatar?: string;
}

/**
 * OAuth 配置接口
 */
interface OAuthConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/**
 * 获取 OAuth 配置
 */
async function getOAuthConfig(provider: OAuthProvider): Promise<OAuthConfig> {
  const siteUrl = await getConfig<string>("site.url");
  const redirectUri = `${siteUrl}/sso/${provider}/callback`;

  const enabled = await getConfig<boolean>(`user.sso.${provider}.enabled`);
  const providerConfig = await getConfig<{
    clientId: string;
    clientSecret: string;
  }>(`user.sso.${provider}`);

  const { clientId, clientSecret } = providerConfig || {
    clientId: "",
    clientSecret: "",
  };

  return {
    enabled,
    clientId,
    clientSecret,
    redirectUri,
  };
}

/**
 * 检查 OAuth 提供商是否已启用
 */
export async function isOAuthEnabled(
  provider: OAuthProvider,
): Promise<boolean> {
  try {
    const config = await getOAuthConfig(provider);
    return config.enabled && !!config.clientId && !!config.clientSecret;
  } catch {
    return false;
  }
}

/**
 * 创建 Google OAuth 客户端
 */
async function createGoogleClient(config: OAuthConfig): Promise<Google> {
  return new Google(config.clientId, config.clientSecret, config.redirectUri);
}

/**
 * 创建 GitHub OAuth 客户端
 */
async function createGitHubClient(config: OAuthConfig): Promise<GitHub> {
  return new GitHub(config.clientId, config.clientSecret, config.redirectUri);
}

/**
 * 创建 Microsoft OAuth 客户端
 */
async function createMicrosoftClient(
  config: OAuthConfig,
): Promise<MicrosoftEntraId> {
  // 使用 "common" 租户，支持个人账户和工作/学校账户
  return new MicrosoftEntraId(
    "common",
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

/**
 * 获取 OAuth 授权 URL
 */
export async function getAuthorizationUrl(
  provider: OAuthProvider,
  state: string,
): Promise<{ url: URL; codeVerifier?: string }> {
  const config = await getOAuthConfig(provider);

  if (!config.enabled) {
    throw new Error(`${provider} OAuth 未启用`);
  }

  switch (provider) {
    case "google": {
      const google = await createGoogleClient(config);
      const codeVerifier = generateCodeVerifier();
      const scopes = ["openid", "profile", "email"];
      const url = google.createAuthorizationURL(state, codeVerifier, scopes);
      return { url, codeVerifier };
    }

    case "github": {
      const github = await createGitHubClient(config);
      const scopes = ["user:email"];
      const url = github.createAuthorizationURL(state, scopes);
      // 注意：GitHub 支持 PKCE，但 arctic 库的 GitHub 实现暂不支持
      return { url };
    }

    case "microsoft": {
      const microsoft = await createMicrosoftClient(config);
      const codeVerifier = generateCodeVerifier();
      const scopes = ["openid", "profile", "email", "User.Read"];
      const url = microsoft.createAuthorizationURL(state, codeVerifier, scopes);
      return { url, codeVerifier };
    }

    default:
      throw new Error(`不支持的 OAuth 提供商: ${provider}`);
  }
}

/**
 * 验证 OAuth 回调并获取用户信息
 */
export async function validateOAuthCallback(
  provider: OAuthProvider,
  code: string,
  codeVerifier?: string,
): Promise<OAuthUserInfo> {
  const config = await getOAuthConfig(provider);

  if (!config.enabled) {
    throw new Error(`${provider} OAuth 未启用`);
  }

  switch (provider) {
    case "google": {
      const google = await createGoogleClient(config);
      if (!codeVerifier) {
        throw new Error("Google OAuth 需要 code verifier");
      }

      const tokens = await google.validateAuthorizationCode(code, codeVerifier);

      // 获取用户信息
      const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokens.accessToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("获取 Google 用户信息失败");
      }

      const user = await response.json();

      return {
        provider: "google",
        providerAccountId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.picture,
      };
    }

    case "github": {
      const github = await createGitHubClient(config);
      // 注意：GitHub 支持 PKCE，但 arctic 库的 GitHub 实现暂不支持
      const tokens = await github.validateAuthorizationCode(code);

      // 获取用户信息
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          "User-Agent": "NeutralPress",
        },
      });

      if (!userResponse.ok) {
        throw new Error("获取 GitHub 用户信息失败");
      }

      const user = await userResponse.json();

      // 获取邮箱（可能需要额外请求）
      let email = user.email;
      if (!email) {
        const emailResponse = await fetch(
          "https://api.github.com/user/emails",
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken()}`,
              "User-Agent": "NeutralPress",
            },
          },
        );

        if (emailResponse.ok) {
          const emails = await emailResponse.json();
          const primaryEmail = emails.find(
            (e: { primary: boolean; email: string }) => e.primary,
          );
          email = primaryEmail?.email || emails[0]?.email;
        }
      }

      if (!email) {
        throw new Error("无法获取 GitHub 邮箱");
      }

      return {
        provider: "github",
        providerAccountId: user.id.toString(),
        email,
        name: user.name || user.login,
        avatar: user.avatar_url,
      };
    }

    case "microsoft": {
      const microsoft = await createMicrosoftClient(config);
      if (!codeVerifier) {
        throw new Error("Microsoft OAuth 需要 code verifier");
      }
      const tokens = await microsoft.validateAuthorizationCode(
        code,
        codeVerifier,
      );

      // 获取用户信息
      const response = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Microsoft Graph API error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `获取 Microsoft 用户信息失败: ${response.status} ${response.statusText}`,
        );
      }

      const user = await response.json();

      return {
        provider: "microsoft",
        providerAccountId: user.id,
        email: user.mail || user.userPrincipalName,
        name: user.displayName,
        avatar: undefined, // Microsoft Graph API 需要额外请求获取头像
      };
    }

    default:
      throw new Error(`不支持的 OAuth 提供商: ${provider}`);
  }
}

/**
 * 生成随机 state 用于 CSRF 防护
 */
export function generateState(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
