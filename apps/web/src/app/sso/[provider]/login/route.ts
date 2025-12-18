import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import {
  getAuthorizationUrl,
  isOAuthEnabled,
  generateState,
  type OAuthProvider,
} from "@/lib/server/oauth";
import limitControl from "@/lib/server/rateLimit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  // 速率限制检查
  if (!(await limitControl(await headers(), "sso_login"))) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("请求过于频繁，请稍后再试")}`,
        request.url,
      ),
    );
  }

  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  const redirect_to = searchParams.get("redirect_to");

  // 验证 provider
  const validProviders: OAuthProvider[] = ["google", "github", "microsoft"];
  if (!validProviders.includes(provider as OAuthProvider)) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("不支持的登录方式")}`,
        request.url,
      ),
    );
  }

  const oauthProvider = provider as OAuthProvider;

  // 检查是否启用
  const enabled = await isOAuthEnabled(oauthProvider);
  if (!enabled) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(`${provider.toUpperCase()} 登录未启用`)}`,
        request.url,
      ),
    );
  }

  try {
    // 生成 state 用于 CSRF 防护
    const state = generateState();

    // 获取授权 URL
    const { url, codeVerifier } = await getAuthorizationUrl(
      oauthProvider,
      state,
    );

    // 将 state 和 codeVerifier（如果有）存储到 cookie
    const cookieStore = await cookies();
    cookieStore.set(`oauth_state_${provider}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 分钟
      path: "/",
    });

    if (codeVerifier) {
      cookieStore.set(`oauth_verifier_${provider}`, codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600, // 10 分钟
        path: "/",
      });
    }

    // 存储重定向目标
    if (redirect_to) {
      cookieStore.set(`oauth_redirect_to`, redirect_to, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600, // 10 分钟
        path: "/",
      });
    }

    // 重定向到 OAuth 提供商
    return NextResponse.redirect(url);
  } catch (error) {
    console.error("SSO login error:", error);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error instanceof Error ? error.message : "登录失败")}`,
        request.url,
      ),
    );
  }
}
