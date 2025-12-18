"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  verifyPasswordForReauth,
  getCurrentUserForReauth,
} from "@/actions/reauth";
import type { OAuthProvider } from "@/lib/server/oauth";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { useToast } from "@/ui/Toast";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import {
  RiGoogleFill,
  RiGithubFill,
  RiMicrosoftFill,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import UnauthorizedPage from "../../unauthorized";
import { CaptchaButton } from "@/components/CaptchaButton";
import { useBroadcast } from "@/hooks/useBroadcast";

export default function ReauthClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [user, setUser] = useState<{
    uid: number;
    username: string;
    email: string;
    hasPassword: boolean;
    linkedProviders: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // 标志：是否正在进行 SSO 验证（使用 ref 以便在事件处理器中访问最新值）
  const isSSORedirectingRef = useRef(false);

  // BroadcastChannel 用于通知父窗口
  const [channel] = useState(() => {
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      return new BroadcastChannel("reauth-channel");
    }
    return null;
  });

  // 监听验证码解决事件
  useBroadcast((message: { type: string; token?: string }) => {
    if (message?.type === "captcha-solved" && message.token) {
      setCaptchaToken(message.token);
    }
  });

  useEffect(() => {
    // 检查 SSO 回调的成功/错误参数
    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");

    if (successParam) {
      // SSO 验证成功
      toast.success(successParam);
      // 通知父窗口验证成功
      if (channel) {
        channel.postMessage({ type: "reauth-success" });
      }
      // 延迟关闭窗口，让用户看到成功消息
      setTimeout(() => {
        window.close();
      }, 500);
      return; // 不再执行后续的用户信息加载
    }

    if (errorParam) {
      // SSO 验证失败
      toast.error(errorParam);
      setLoading(false);
      return; // 不再执行后续的用户信息加载
    }

    // 正常流程 - 加载用户信息
    loadUserInfo();

    // 监听窗口关闭事件
    const handleBeforeUnload = () => {
      // 只有在不是 SSO 跳转时才发送取消消息
      if (channel && !isSSORedirectingRef.current) {
        channel.postMessage({ type: "reauth-cancelled" });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      channel?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadUserInfo = async () => {
    try {
      const result = await getCurrentUserForReauth();
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        toast.error(result.message || "加载失败");
        // 如果未登录，关闭窗口
        setTimeout(() => {
          if (channel) {
            channel.postMessage({ type: "reauth-cancelled" });
          }
          window.close();
        }, 1000);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordVerify = async () => {
    if (!password) {
      toast.error("请输入密码");
      return;
    }

    if (!captchaToken) {
      toast.error("请等待安全验证完成");
      return;
    }

    setVerifying(true);
    try {
      const result = await verifyPasswordForReauth({
        password,
        captcha_token: captchaToken,
      });

      if (result.success) {
        toast.success("验证成功");
        // 通知父窗口验证成功
        if (channel) {
          channel.postMessage({ type: "reauth-success" });
        }
        // 延迟关闭窗口，让用户看到成功消息
        setTimeout(() => {
          window.close();
        }, 500);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "验证失败");
    } finally {
      setVerifying(false);
    }
  };

  const handleSSOVerify = (provider: OAuthProvider) => {
    // 设置标志：正在进行 SSO 验证
    isSSORedirectingRef.current = true;

    // 跳转到 SSO 验证流程
    router.push(`/sso/${provider}/login?mode=reauth`);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "google":
        return <RiGoogleFill size="1.25em" />;
      case "github":
        return <RiGithubFill size="1.25em" />;
      case "microsoft":
        return <RiMicrosoftFill size="1.25em" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <LoadingIndicator size="md" />
      </div>
    );
  }

  if (!user) {
    return <UnauthorizedPage redirect="/reauth" />;
  }

  return (
    <div className="fixed inset-0 bg-background overflow-hidden">
      <div className="h-full flex flex-col md:flex-row">
        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="flex gap-5 items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-foreground tracking-wider mb-2">
                  重新验证身份
                </h1>
                <p className="text-muted-foreground">
                  为了安全，请验证你的身份。
                </p>
              </div>
              <div className="inline-flex w-16 h-16items-center justify-center mb-4">
                <RiShieldKeyholeLine size="3em" className="text-primary" />
              </div>
            </div>
            {/* 验证方式 */}
            <div className="space-y-6">
              {/* 密码验证 */}
              {user.hasPassword && (
                <div className="space-y-4">
                  <Input
                    label="Password / 密码"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    helperText="输入你的账户密码"
                    icon={<RiShieldKeyholeLine size={"1em"} />}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !verifying) {
                        handlePasswordVerify();
                      }
                    }}
                    disabled={verifying}
                  />
                  <div className="pt-6 w-full">
                    <CaptchaButton
                      label="下一步"
                      onClick={handlePasswordVerify}
                      loading={verifying}
                      loadingText="验证中..."
                      verificationText="正在执行安全验证"
                      variant="secondary"
                      size="md"
                      fullWidth
                    />
                  </div>
                </div>
              )}

              {/* 分隔线 */}
              {user.hasPassword && user.linkedProviders.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted-foreground/30"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-background text-muted-foreground">
                      或使用以下方式验证
                    </span>
                  </div>
                </div>
              )}

              {/* SSO 验证 */}
              {user.linkedProviders.length > 0 && (
                <div
                  className={`grid gap-3 ${
                    user.linkedProviders.length === 1
                      ? "grid-cols-1"
                      : user.linkedProviders.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3"
                  }`}
                >
                  {user.linkedProviders.map((provider) => (
                    <Button
                      key={provider}
                      label=""
                      onClick={() => handleSSOVerify(provider as OAuthProvider)}
                      variant="secondary"
                      size="md"
                      icon={getProviderIcon(provider)}
                      disabled={verifying}
                    />
                  ))}
                </div>
              )}

              {/* 如果没有任何验证方式 */}
              {!user.hasPassword && user.linkedProviders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">
                    你的账户未设置任何验证方式
                  </p>
                  <p className="text-sm text-muted-foreground">请联系管理员</p>
                </div>
              )}

              {/* 取消按钮 */}
              <div className="pt-3 w-full">
                <Button
                  label="取消"
                  onClick={() => {
                    if (channel) {
                      channel.postMessage({ type: "reauth-cancelled" });
                    }
                    window.close();
                  }}
                  variant="ghost"
                  size="md"
                  fullWidth
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
