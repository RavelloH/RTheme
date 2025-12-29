import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { handleSSOCallback, handleSSOBind } from "@/actions/sso";
import limitControl from "@/lib/server/rate-limit";
import { jwtTokenVerify } from "@/lib/server/jwt";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  // 速率限制检查
  if (!(await limitControl(await headers(), "sso_callback"))) {
    const cookieStore = await cookies();
    cookieStore.set("sso_login_error", "请求过于频繁，请稍后再试", {
      httpOnly: false, // 客户端需要读取
      maxAge: 60,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return NextResponse.redirect(new URL("/login?sso=error", request.url));
  }

  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const cookieStore = await cookies();

  // OAuth 提供商返回错误
  if (error) {
    cookieStore.set("sso_login_error", `授权失败: ${error}`, {
      httpOnly: false, // 客户端需要读取
      maxAge: 60, // 1分钟过期
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return NextResponse.redirect(new URL("/login?sso=error", request.url));
  }

  // 缺少必要参数
  if (!code || !state) {
    cookieStore.set("sso_login_error", "缺少必要的授权信息", {
      httpOnly: false, // 客户端需要读取
      maxAge: 60,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
    return NextResponse.redirect(new URL("/login?sso=error", request.url));
  }

  // 读取模式标识
  const mode = cookieStore.get(`oauth_mode_${provider}`)?.value || "login";

  // 根据模式使用不同的 cookie 前缀
  let cookiePrefix = "oauth";
  if (mode === "bind") {
    cookiePrefix = "oauth_bind";
  } else if (mode === "reauth") {
    cookiePrefix = "oauth_reauth";
  }

  // 获取 codeVerifier
  const codeVerifier =
    cookieStore.get(`${cookiePrefix}_verifier_${provider}`)?.value || undefined;

  try {
    if (mode === "reauth") {
      // Reauth 模式 - 验证身份并设置 REAUTH_TOKEN
      const reauthTokenCookie = cookieStore.get(
        `oauth_reauth_token_${provider}`,
      )?.value;
      if (!reauthTokenCookie) {
        return NextResponse.redirect(
          new URL(
            `/reauth?error=${encodeURIComponent("验证失败：缺少认证信息")}`,
            request.url,
          ),
        );
      }

      // 验证 JWT token
      const reauthTokenPayload = jwtTokenVerify<{
        uid: number;
        purpose: string;
        provider: string;
      }>(reauthTokenCookie);

      if (
        !reauthTokenPayload ||
        reauthTokenPayload.purpose !== "oauth_reauth" ||
        reauthTokenPayload.provider !== provider
      ) {
        return NextResponse.redirect(
          new URL(
            `/reauth?error=${encodeURIComponent("验证失败：认证信息无效")}`,
            request.url,
          ),
        );
      }

      const uid = reauthTokenPayload.uid;

      // 验证 state（CSRF 防护）- 使用 JWT
      const storedStateToken = cookieStore.get(
        `${cookiePrefix}_state_${provider}`,
      )?.value;
      if (!storedStateToken) {
        // 清除相关 cookies
        cookieStore.delete(`${cookiePrefix}_state_${provider}`);
        cookieStore.delete(`${cookiePrefix}_verifier_${provider}`);
        cookieStore.delete(`oauth_mode_${provider}`);
        cookieStore.delete(`oauth_reauth_token_${provider}`);

        return NextResponse.redirect(
          new URL(
            `/reauth?error=${encodeURIComponent("验证失败：缺少 state")}`,
            request.url,
          ),
        );
      }

      // 验证并解析 JWT state token
      const statePayload = jwtTokenVerify<{
        state: string;
        mode: string;
        provider: string;
        timestamp: number;
      }>(storedStateToken);

      if (
        !statePayload ||
        statePayload.state !== state ||
        statePayload.mode !== "reauth" ||
        statePayload.provider !== provider
      ) {
        // 清除相关 cookies
        cookieStore.delete(`${cookiePrefix}_state_${provider}`);
        cookieStore.delete(`${cookiePrefix}_verifier_${provider}`);
        cookieStore.delete(`oauth_mode_${provider}`);
        cookieStore.delete(`oauth_reauth_token_${provider}`);

        return NextResponse.redirect(
          new URL(
            `/reauth?error=${encodeURIComponent("验证失败：state 不匹配")}`,
            request.url,
          ),
        );
      }

      // 完成 OAuth 流程，获取用户信息
      let oauthUserInfo;
      try {
        const { validateOAuthCallback } = await import("@/lib/server/oauth");
        oauthUserInfo = await validateOAuthCallback(
          provider as import("@/lib/server/oauth").OAuthProvider,
          code,
          codeVerifier,
        );
      } catch (error) {
        console.error("OAuth validation error:", error);

        // 清除相关 cookies
        cookieStore.delete(`${cookiePrefix}_state_${provider}`);
        cookieStore.delete(`${cookiePrefix}_verifier_${provider}`);
        cookieStore.delete(`oauth_mode_${provider}`);
        cookieStore.delete(`oauth_reauth_token_${provider}`);

        return NextResponse.redirect(
          new URL(
            `/reauth?error=${encodeURIComponent(
              error instanceof Error ? error.message : "OAuth 验证失败",
            )}`,
            request.url,
          ),
        );
      }

      // 调用 verifySSOForReauth，传入 providerAccountId 进行账户绑定验证
      const { verifySSOForReauth } = await import("@/actions/reauth");
      const result = await verifySSOForReauth({
        uid,
        provider,
        providerAccountId: oauthUserInfo.providerAccountId,
      });

      // 清除相关 cookies
      cookieStore.delete(`${cookiePrefix}_state_${provider}`);
      cookieStore.delete(`${cookiePrefix}_verifier_${provider}`);
      cookieStore.delete(`oauth_mode_${provider}`);
      cookieStore.delete(`oauth_reauth_token_${provider}`);

      if (!result.success) {
        return NextResponse.redirect(
          new URL(
            `/reauth?error=${encodeURIComponent(result.message || "验证失败")}`,
            request.url,
          ),
        );
      }

      // Reauth 成功，重定向回 /reauth 页面
      // 页面会通过 BroadcastChannel 通知父窗口并关闭自己
      return NextResponse.redirect(
        new URL(
          `/reauth?success=${encodeURIComponent("验证成功")}`,
          request.url,
        ),
      );
    } else if (mode === "bind") {
      // 绑定模式
      const result = await handleSSOBind({
        provider,
        code,
        state,
        codeVerifier,
      });

      if (!result.success) {
        return NextResponse.redirect(
          new URL(
            `/settings?error=${encodeURIComponent(result.message || "绑定失败")}`,
            request.url,
          ),
        );
      }

      // 绑定成功，获取重定向目标
      const redirectTo =
        cookieStore.get(`${cookiePrefix}_redirect_to`)?.value || "/settings";

      // 清除相关 cookies
      cookieStore.delete(`${cookiePrefix}_state_${provider}`);
      cookieStore.delete(`${cookiePrefix}_verifier_${provider}`);
      cookieStore.delete(`${cookiePrefix}_redirect_to`);
      cookieStore.delete(`oauth_mode_${provider}`);
      cookieStore.delete(`oauth_bind_token_${provider}`); // 清除绑定时存储的 JWT token

      // 跳转到目标页面
      return NextResponse.redirect(
        new URL(
          `${redirectTo}?success=${encodeURIComponent(result.message)}`,
          request.url,
        ),
      );
    } else {
      // 登录模式
      const result = await handleSSOCallback({
        provider,
        code,
        state,
        codeVerifier,
      });

      if (!result.success) {
        // 清除 OAuth 流程相关的 cookies
        cookieStore.delete(`oauth_state_${provider}`);
        cookieStore.delete(`oauth_verifier_${provider}`);
        cookieStore.delete(`oauth_mode_${provider}`);

        cookieStore.set("sso_login_error", result.message || "登录失败", {
          httpOnly: false, // 客户端需要读取
          maxAge: 60,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
        });
        return NextResponse.redirect(new URL("/login?sso=error", request.url));
      }

      const { action, userInfo } = result.data!;

      if (action === "login") {
        // 登录成功，设置结果 Cookie
        cookieStore.set(
          "sso_login_result",
          JSON.stringify({
            success: true,
            userInfo,
            message: "登录成功",
          }),
          {
            httpOnly: false, // 客户端需要读取
            maxAge: 60, // 1分钟过期
            sameSite: "lax",
            path: "/",
            secure: process.env.NODE_ENV === "production",
          },
        );

        // 清除 OAuth 流程相关的 cookies
        cookieStore.delete(`oauth_state_${provider}`);
        cookieStore.delete(`oauth_verifier_${provider}`);
        cookieStore.delete(`oauth_mode_${provider}`);

        // ACCESS_TOKEN 和 REFRESH_TOKEN 已经在 handleSSOCallback 中设置
        return NextResponse.redirect(
          new URL("/login?sso=success", request.url),
        );
      } else {
        // 未知的 action
        cookieStore.set("sso_login_error", "未知的操作类型", {
          httpOnly: false, // 客户端需要读取
          maxAge: 60,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
        });
        return NextResponse.redirect(new URL("/login?sso=error", request.url));
      }
    }
  } catch (error) {
    console.error("SSO callback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "操作失败，请稍后重试";

    // 清除 OAuth 流程相关的 cookies
    cookieStore.delete(`oauth_state_${provider}`);
    cookieStore.delete(`oauth_verifier_${provider}`);
    cookieStore.delete(`oauth_mode_${provider}`);

    if (mode === "bind") {
      cookieStore.delete(`oauth_bind_token_${provider}`);
      return NextResponse.redirect(
        new URL(
          `/settings?error=${encodeURIComponent(errorMessage)}`,
          request.url,
        ),
      );
    } else if (mode === "reauth") {
      cookieStore.delete(`oauth_reauth_token_${provider}`);
      return NextResponse.redirect(
        new URL(
          `/reauth?error=${encodeURIComponent(errorMessage)}`,
          request.url,
        ),
      );
    } else {
      cookieStore.set("sso_login_error", errorMessage, {
        httpOnly: false, // 客户端需要读取
        maxAge: 60,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      });
      return NextResponse.redirect(new URL("/login?sso=error", request.url));
    }
  }
}
