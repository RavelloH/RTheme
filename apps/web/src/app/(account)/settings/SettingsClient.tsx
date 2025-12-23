"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { unlinkSSO, setPassword } from "@/actions/sso";
import { changePassword } from "@/actions/auth";
import type { OAuthProvider } from "@/lib/server/oauth";
import { getUserProfile } from "@/actions/user";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Dialog } from "@/ui/Dialog";
import { useToast } from "@/ui/Toast";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { AutoTransition } from "@/ui/AutoTransition";
import {
  RiGoogleFill,
  RiGithubFill,
  RiMicrosoftFill,
  RiUserLine,
  RiNotification3Line,
  RiShieldKeyholeLine,
} from "@remixicon/react";
import UnauthorizedPage from "../../unauthorized";
import PasskeyManager from "./PasskeyManager";

interface LinkedAccount {
  provider: string;
  email: string;
}

interface UserProfile {
  uid: number;
  username: string;
  email: string;
  hasPassword: boolean;
  linkedAccounts: LinkedAccount[];
}

interface SettingsClientProps {
  enabledSSOProviders: OAuthProvider[];
}

type PendingAction =
  | {
      type: "link";
      data: { provider: OAuthProvider };
    }
  | {
      type: "unlink";
      data: { provider: OAuthProvider };
    }
  | {
      type: "setPassword";
      data: { newPassword: string };
    }
  | {
      type: "changePassword";
      data: { new_password: string };
    };

export default function SettingsClient({
  enabledSSOProviders,
}: SettingsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 密码相关状态
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSetPasswordDialog, setShowSetPasswordDialog] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 解绑相关状态
  const [unlinkProvider, setUnlinkProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  // 当前选中的分类
  const [activeSection, setActiveSection] = useState<string>("basic");

  // Reauth 相关状态
  const reauthWindowRef = useRef<Window | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const sections = [
    { id: "basic", label: "基本信息", icon: RiUserLine },
    { id: "notifications", label: "通知管理", icon: RiNotification3Line },
    { id: "security", label: "安全设置", icon: RiShieldKeyholeLine },
  ];

  // 从 URL hash 读取当前分类
  useEffect(() => {
    const hash = window.location.hash.slice(1); // 去掉 # 号
    if (hash && sections.some((section) => section.id === hash)) {
      setActiveSection(hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 从 URL 参数读取成功/错误消息
    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");
    const triggerReauth = searchParams.get("trigger_reauth");
    const provider = searchParams.get("provider");

    if (successParam) {
      toast.success(successParam);
    }
    if (errorParam) {
      toast.error(errorParam);
    }

    // 清除 URL 中的消息参数（如果有）
    if (successParam || errorParam) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("success");
      newSearchParams.delete("error");

      // 保留其他参数（如 trigger_reauth 和 provider）以及 hash
      const newUrl = newSearchParams.toString()
        ? `/settings?${newSearchParams.toString()}${window.location.hash}`
        : `/settings${window.location.hash}`;
      router.replace(newUrl);
    }

    // 如果需要触发 reauth（从 SSO 登录重定向回来）
    if (triggerReauth === "bind_sso" && provider) {
      // 保存待处理的操作
      pendingActionRef.current = {
        type: "link",
        data: { provider: provider as OAuthProvider },
      };
      // 打开 reauth 窗口
      openReauthWindow();

      // 清除 trigger_reauth 和 provider 参数
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("trigger_reauth");
      newSearchParams.delete("provider");

      const newUrl = newSearchParams.toString()
        ? `/settings?${newSearchParams.toString()}${window.location.hash}`
        : `/settings${window.location.hash}`;
      router.replace(newUrl);
    }

    // 加载用户信息
    loadUserInfo();

    // 初始化 BroadcastChannel
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("reauth-channel");
      channelRef.current = channel;

      // 监听 reauth 结果
      channel.onmessage = (event) => {
        const { type } = event.data;

        if (type === "reauth-success") {
          toast.success("身份验证成功");
          // 关闭 reauth 窗口（如果还开着）
          if (reauthWindowRef.current && !reauthWindowRef.current.closed) {
            reauthWindowRef.current.close();
          }
          // 重试待处理的操作
          retryPendingAction();
        } else if (type === "reauth-cancelled") {
          toast.error("身份验证已取消");
          // 清除待处理的操作
          pendingActionRef.current = null;
          // 清除加载状态
          setUnlinkLoading(false);
          setPasswordLoading(false);
        }
      };
    }

    return () => {
      // 清理 BroadcastChannel
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const loadUserInfo = async () => {
    try {
      const result = await getUserProfile();
      if (result.success && result.data) {
        setUser(result.data);
      } else {
        toast.error(result.message || "加载失败");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  };

  // 打开 reauth 窗口
  const openReauthWindow = () => {
    const reauthWindow = window.open("/reauth", "reauth");

    reauthWindowRef.current = reauthWindow;
  };

  // 检查是否需要 reauth
  const needsReauth = (
    error: unknown,
  ): error is { code: string } | { error: { code: string } } => {
    if (!error || typeof error !== "object") return false;
    const err = error as Record<string, unknown>;
    return (
      err.code === "NEED_REAUTH" ||
      (typeof err.error === "object" &&
        err.error !== null &&
        (err.error as Record<string, unknown>).code === "NEED_REAUTH")
    );
  };

  // 重试待处理的操作
  const retryPendingAction = async () => {
    if (!pendingActionRef.current) return;

    const action = pendingActionRef.current;
    pendingActionRef.current = null;

    switch (action.type) {
      case "link":
        // 重新跳转到 SSO 登录页面（此时已有 REAUTH_TOKEN），并带上当前 hash
        router.push(
          `/sso/${action.data.provider}/login?mode=bind&redirect_to=/settings${window.location.hash}`,
        );
        break;
      case "unlink":
        await executeUnlinkSSO(action.data);
        break;
      case "setPassword":
        await executeSetPassword(action.data);
        break;
      case "changePassword":
        await executeChangePassword(action.data);
        break;
    }
  };

  // 执行解绑 SSO（不检查 reauth）
  const executeUnlinkSSO = async (data: { provider: OAuthProvider }) => {
    setUnlinkLoading(true);
    try {
      const result = await unlinkSSO(data);

      if (result.success) {
        toast.success(result.message);
        setShowUnlinkDialog(false);
        setUnlinkProvider(null);
        loadUserInfo();
      } else if (needsReauth(result.error)) {
        // 需要 reauth
        pendingActionRef.current = { type: "unlink", data };
        openReauthWindow();
      } else {
        toast.error(result.message);
        setUnlinkLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "解绑失败");
      setUnlinkLoading(false);
    }
  };

  // 执行设置密码（不检查 reauth）
  const executeSetPassword = async (data: { newPassword: string }) => {
    setPasswordLoading(true);
    try {
      const result = await setPassword(data);

      if (result.success) {
        toast.success(result.message);
        setShowSetPasswordDialog(false);
        setNewPassword("");
        setConfirmPassword("");
        loadUserInfo();
        setPasswordLoading(false); // 清除 loading 状态
      } else if (needsReauth(result.error)) {
        // 需要 reauth
        pendingActionRef.current = { type: "setPassword", data };
        openReauthWindow();
      } else {
        toast.error(result.message);
        setPasswordLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "设置密码失败");
      setPasswordLoading(false);
    }
  };

  // 执行修改密码（不检查 reauth）
  const executeChangePassword = async (data: { new_password: string }) => {
    setPasswordLoading(true);
    try {
      // changePassword 要求传入完整的 ChangePassword 对象
      // 虽然实现中不需要 old_password，但类型定义要求提供
      // 这里传入一个空字符串作为占位符
      const result = await changePassword({
        old_password: "", // 占位符，实现中会忽略
        new_password: data.new_password,
      });

      if (result.success) {
        toast.success("密码修改成功，请重新登录");
        setShowPasswordDialog(false);
        setNewPassword("");
        setConfirmPassword("");

        // 清空 localStorage 中的用户信息
        if (typeof window !== "undefined") {
          localStorage.removeItem("user_info");
          // 触发自定义事件，通知其他组件 user_info 已清空
          window.dispatchEvent(
            new CustomEvent("localStorageUpdate", {
              detail: { key: "user_info" },
            }),
          );
        }

        // 延迟跳转到登录页，让用户看到成功消息
        setTimeout(() => {
          router.push("/login?message=密码已修改，请使用新密码登录");
        }, 1000);
      } else if (needsReauth(result.error)) {
        // 需要 reauth
        pendingActionRef.current = { type: "changePassword", data };
        openReauthWindow();
      } else {
        toast.error(result.message);
        setPasswordLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "修改密码失败");
      setPasswordLoading(false);
    }
  };

  const handleLinkSSO = async (provider: OAuthProvider) => {
    // 直接跳转到 SSO 登录页面，并带上当前 hash
    // 在 SSO login route 中会检查 REAUTH_TOKEN，如果没有会重定向回来触发 reauth
    router.push(
      `/sso/${provider}/login?mode=bind&redirect_to=/settings${window.location.hash}`,
    );
  };

  const handleUnlinkSSO = async () => {
    if (!unlinkProvider) {
      toast.error("未选择解绑的提供商");
      return;
    }

    await executeUnlinkSSO({
      provider: unlinkProvider,
    });
  };

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("密码长度至少为 8 位");
      return;
    }

    await executeSetPassword({ newPassword });
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("密码长度至少为 8 位");
      return;
    }

    await executeChangePassword({
      new_password: newPassword,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingIndicator size="lg" />
      </div>
    );
  }

  if (!user) {
    return <UnauthorizedPage redirect="/settings" />;
  }

  const linkedProviders = user.linkedAccounts.map((acc) =>
    acc.provider.toLowerCase(),
  );

  const getProviderName = (provider: OAuthProvider) => {
    switch (provider) {
      case "google":
        return "Google";
      case "github":
        return "GitHub";
      case "microsoft":
        return "Microsoft";
      default:
        return provider;
    }
  };

  const getProviderIcon = (provider: OAuthProvider) => {
    switch (provider) {
      case "google":
        return <RiGoogleFill size="1.5em" />;
      case "github":
        return <RiGithubFill size="1.5em" />;
      case "microsoft":
        return <RiMicrosoftFill size="1.5em" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-wider">
            账户设置
          </h1>
          <p className="mt-2 text-muted-foreground">
            管理你的账户信息和偏好设置
          </p>
        </div>

        {/* 左右两栏布局 */}
        <div className="flex gap-8">
          {/* 左侧导航栏 */}
          <aside className="w-64 flex-shrink-0">
            <nav className="sticky top-8 space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      // 更新 URL hash
                      window.history.replaceState(
                        null,
                        "",
                        `/settings#${section.id}`,
                      );
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 rounded-sm
                      text-left transition-all duration-200
                      ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground hover:bg-foreground/5"
                      }
                    `}
                  >
                    <Icon size="1.25em" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* 右侧内容区 */}
          <main className="flex-1 min-w-0">
            <AutoTransition type="fade" duration={0.3}>
              {/* 基本信息 */}
              {activeSection === "basic" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-wider">
                      基本信息
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      查看和管理你的账户基本信息
                    </p>
                  </div>

                  <div className="bg-background border border-foreground/10 rounded-sm p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b border-foreground/10">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            用户名
                          </p>
                          <p className="text-foreground font-medium">
                            {user.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b border-foreground/10">
                        <div>
                          <p className="text-sm text-muted-foreground">邮箱</p>
                          <p className="text-foreground font-medium">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            用户ID
                          </p>
                          <p className="text-foreground font-medium font-mono">
                            {user.uid}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 通知管理 */}
              {activeSection === "notifications" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-wider">
                      通知管理
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      管理你的通知偏好设置
                    </p>
                  </div>

                  <div className="bg-background border border-foreground/10 rounded-sm p-6">
                    <div className="flex items-center justify-center py-12">
                      <p className="text-muted-foreground">
                        通知设置功能开发中...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 安全设置 */}
              {activeSection === "security" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-wider">
                      安全设置
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      管理你的登录方式和账户安全
                    </p>
                  </div>

                  {/* 密码设置 */}
                  <div className="bg-background border border-foreground/10 rounded-sm">
                    <div className="px-6 py-4 border-b border-foreground/10">
                      <h3 className="text-lg font-medium text-foreground tracking-wider">
                        密码
                      </h3>
                    </div>
                    <div className="p-6">
                      {user.hasPassword ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground font-medium">
                              密码已设置
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              已启用密码登录
                            </p>
                          </div>
                          <Button
                            label="修改密码"
                            onClick={() => setShowPasswordDialog(true)}
                            variant="secondary"
                            size="sm"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground font-medium">
                              未设置密码
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              设置密码后可以使用密码登录
                            </p>
                          </div>
                          <Button
                            label="设置密码"
                            onClick={() => setShowSetPasswordDialog(true)}
                            variant="secondary"
                            size="sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SSO 账户管理 */}
                  {enabledSSOProviders.length > 0 && (
                    <div className="bg-background border border-foreground/10 rounded-sm">
                      <div className="px-6 py-4 border-b border-foreground/10">
                        <h3 className="text-lg font-medium text-foreground tracking-wider">
                          SSO 登录方式
                        </h3>
                      </div>
                      <div className="p-6">
                        <div className="space-y-4">
                          {enabledSSOProviders.map((provider) => {
                            const isLinked = linkedProviders.includes(provider);
                            return (
                              <div
                                key={provider}
                                className="flex items-center justify-between py-3 border-b border-foreground/10 last:border-0"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 flex items-center justify-center">
                                    {getProviderIcon(provider)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {getProviderName(provider)}
                                    </p>
                                    {isLinked ? (
                                      <p className="text-sm text-muted-foreground">
                                        已绑定 -{" "}
                                        {
                                          user.linkedAccounts.find(
                                            (acc) =>
                                              acc.provider.toLowerCase() ===
                                              provider,
                                          )?.email
                                        }
                                      </p>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">
                                        未绑定
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {isLinked ? (
                                  <Button
                                    label="解绑"
                                    onClick={() => {
                                      setUnlinkProvider(provider);
                                      setShowUnlinkDialog(true);
                                    }}
                                    variant="danger"
                                    size="sm"
                                  />
                                ) : (
                                  <Button
                                    label="绑定"
                                    onClick={() => handleLinkSSO(provider)}
                                    variant="secondary"
                                    size="sm"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 通行密钥管理 */}
                  <div className="bg-background border border-foreground/10 rounded-sm">
                    <div className="px-6 py-4 border-b border-foreground/10">
                      <h3 className="text-lg font-medium text-foreground tracking-wider">
                        通行密钥管理
                      </h3>
                    </div>
                    <div className="p-6">
                      <PasskeyManager />
                    </div>
                  </div>
                </div>
              )}
            </AutoTransition>
          </main>
        </div>

        {/* 修改密码对话框 */}
        <Dialog
          open={showPasswordDialog}
          onClose={() => {
            setShowPasswordDialog(false);
            setNewPassword("");
            setConfirmPassword("");
          }}
          title="修改密码"
          size="sm"
        >
          <div className="px-6 py-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  设置新密码
                </h3>
                <p className="text-sm text-muted-foreground">
                  为保障安全，在修改密码前需要验证你的身份
                </p>
              </div>
              <div className="space-y-4">
                <Input
                  label="新密码"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  size="sm"
                  helperText="至少 8 位字符"
                />
                <Input
                  label="确认新密码"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  size="sm"
                  helperText="再次输入新密码"
                />
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                size="sm"
                disabled={passwordLoading}
              />
              <Button
                label="确认修改"
                variant="secondary"
                onClick={handleChangePassword}
                loading={passwordLoading}
                loadingText="修改中..."
                size="sm"
              />
            </div>
          </div>
        </Dialog>

        {/* 设置密码对话框 */}
        <Dialog
          open={showSetPasswordDialog}
          onClose={() => {
            setShowSetPasswordDialog(false);
            setNewPassword("");
            setConfirmPassword("");
          }}
          title="设置密码"
          size="sm"
        >
          <div className="px-6 py-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  创建密码
                </h3>
                <p className="text-sm text-muted-foreground">
                  设置密码后可以使用邮箱和密码登录
                </p>
              </div>
              <div className="space-y-4">
                <Input
                  label="新密码"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  size="sm"
                  helperText="至少 8 位字符"
                />
                <Input
                  label="确认密码"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  size="sm"
                  helperText="再次输入密码"
                />
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={() => {
                  setShowSetPasswordDialog(false);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                size="sm"
                disabled={passwordLoading}
              />
              <Button
                label="确认设置"
                variant="secondary"
                onClick={handleSetPassword}
                loading={passwordLoading}
                loadingText="设置中..."
                size="sm"
              />
            </div>
          </div>
        </Dialog>

        {/* 解绑 SSO 对话框 */}
        <Dialog
          open={showUnlinkDialog}
          onClose={() => {
            setShowUnlinkDialog(false);
            setUnlinkProvider(null);
          }}
          title={`解绑 ${unlinkProvider ? getProviderName(unlinkProvider) : ""}`}
          size="sm"
        >
          <div className="px-6 py-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  确认解绑
                </h3>
                <p className="text-sm text-muted-foreground">
                  解绑后将无法使用此方式登录。为保障安全，在执行操作前需要验证你的身份。
                </p>
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={() => {
                  setShowUnlinkDialog(false);
                  setUnlinkProvider(null);
                }}
                size="sm"
                disabled={unlinkLoading}
              />
              <Button
                label="确认解绑"
                variant="danger"
                onClick={handleUnlinkSSO}
                loading={unlinkLoading}
                loadingText="解绑中..."
                size="sm"
              />
            </div>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
