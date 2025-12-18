import { NextRequest, NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { handleSSOCallback } from "@/actions/sso";
import limitControl from "@/lib/server/rateLimit";

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

  // 获取 codeVerifier
  const codeVerifier =
    cookieStore.get(`oauth_verifier_${provider}`)?.value || undefined;

  try {
    // 处理 SSO 回调
    const result = await handleSSOCallback({
      provider,
      code,
      state,
      codeVerifier,
    });

    if (!result.success) {
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

      // ACCESS_TOKEN 和 REFRESH_TOKEN 已经在 handleSSOCallback 中设置
      return NextResponse.redirect(new URL("/login?sso=success", request.url));
    } else if (action === "bind") {
      // 绑定成功，跳转到设置页面
      return NextResponse.redirect(
        new URL(
          `/settings?success=${encodeURIComponent(`成功绑定 ${provider.toUpperCase()} 账户`)}`,
          request.url,
        ),
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
  } catch (error) {
    console.error("SSO callback error:", error);
    cookieStore.set(
      "sso_login_error",
      error instanceof Error ? error.message : "登录失败，请稍后重试",
      {
        httpOnly: false, // 客户端需要读取
        maxAge: 60,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    );
    return NextResponse.redirect(new URL("/login?sso=error", request.url));
  }
}
