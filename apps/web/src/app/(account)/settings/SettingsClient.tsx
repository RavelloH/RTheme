/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { unlinkSSO, setPassword } from "@/actions/sso";
import { changePassword } from "@/actions/auth";
import { getSessions, revokeSession } from "@/actions/auth";
import {
  getTotpStatus,
  enableTotp,
  confirmTotp,
  disableTotp,
  regenerateBackupCodes,
} from "@/actions/totp";
import type { OAuthProvider } from "@/lib/server/oauth";
import { getUserProfile } from "@/actions/user";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Dialog } from "@/ui/Dialog";
import { useToast } from "@/ui/Toast";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { AutoTransition } from "@/ui/AutoTransition";
import { AutoResizer } from "@/ui/AutoResizer";
import { Checkbox } from "@/ui/Checkbox";
import Clickable from "@/ui/Clickable";
import { OtpInput } from "@/ui/OtpInput";
import QRCode from "qrcode";
import {
  RiGoogleFill,
  RiGithubFill,
  RiMicrosoftFill,
  RiUserLine,
  RiNotification3Line,
  RiShieldKeyholeLine,
  RiDeviceLine,
  RiWindowsFill,
  RiAppleFill,
  RiAndroidFill,
  RiTerminalBoxFill,
  RiComputerLine,
  RiDeleteBinLine,
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

interface Session {
  id: string;
  deviceType: string;
  deviceIcon: string;
  displayName: string;
  browserName: string;
  browserVersion: string;
  createdAt: string;
  lastUsedAt: string | null;
  ipAddress: string;
  ipLocation: string | null;
  revokedAt: string | null;
  isCurrent: boolean;
}

interface SettingsClientProps {
  enabledSSOProviders: OAuthProvider[];
  passkeyEnabled: boolean;
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
    }
  | {
      type: "revokeSession";
      data: { sessionId: string };
    };

export default function SettingsClient({
  enabledSSOProviders,
  passkeyEnabled,
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

  // 会话管理相关状态
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeSessionId, setRevokeSessionId] = useState<string | null>(null);
  const [showRevokeSessionDialog, setShowRevokeSessionDialog] = useState(false);
  const [revokeSessionLoading, setRevokeSessionLoading] = useState(false);

  // TOTP 相关状态
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [totpBackupCodesRemaining, setTotpBackupCodesRemaining] = useState(0);
  const [totpLoading, setTotpLoading] = useState(false);
  const [showTotpSetupDialog, setShowTotpSetupDialog] = useState(false);
  const [showTotpDisableDialog, setShowTotpDisableDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [totpSecret, setTotpSecret] = useState("");
  const [totpQrCodeUri, setTotpQrCodeUri] = useState("");
  const [totpSetupCode, setTotpSetupCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodesConfirmed, setBackupCodesConfirmed] = useState(false);

  // 当前选中的分类
  const [activeSection, setActiveSection] = useState<string>("basic");

  // Reauth 相关状态
  const reauthWindowRef = useRef<Window | null>(null);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const sections = [
    { id: "basic", label: "基本信息", icon: RiUserLine },
    { id: "notifications", label: "通知管理", icon: RiNotification3Line },
    { id: "sessions", label: "会话管理", icon: RiDeviceLine },
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

  // 当进入会话管理页面时自动加载会话列表
  useEffect(() => {
    if (activeSection === "sessions" && sessions.length === 0) {
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  // 当进入安全设置页面时加载 TOTP 状态
  useEffect(() => {
    if (activeSection === "security") {
      loadTotpStatus();
    }
  }, [activeSection]);

  // 生成 QR 码图片
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  useEffect(() => {
    if (totpQrCodeUri && showTotpSetupDialog) {
      QRCode.toDataURL(totpQrCodeUri, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url: string) => setQrCodeDataUrl(url))
        .catch((err: Error) =>
          console.error("Failed to generate QR code:", err),
        );
    }
  }, [totpQrCodeUri, showTotpSetupDialog]);

  useEffect(() => {
    // 从 URL 参数读取成功/错误消息
    const successParam = searchParams.get("success");
    const errorParam = searchParams.get("error");
    const triggerReauth = searchParams.get("trigger_reauth");
    const provider = searchParams.get("provider");

    // 如果是绑定成功返回，恢复保存的 hash
    if (successParam && !window.location.hash) {
      const savedHash = localStorage.getItem("sso_bind_return_hash");
      if (savedHash) {
        localStorage.removeItem("sso_bind_return_hash");
        window.location.hash = savedHash;
      }
    }

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

  // 加载 TOTP 状态
  const loadTotpStatus = async () => {
    try {
      const result = await getTotpStatus();
      if (result.success && result.data) {
        setTotpEnabled(result.data.enabled);
        setTotpBackupCodesRemaining(result.data.backupCodesRemaining);
      }
    } catch (err) {
      console.error("Failed to load TOTP status:", err);
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
      case "revokeSession":
        await executeRevokeSession(action.data);
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
    // 保存当前 hash 到 localStorage（因为 hash 不会发送到服务器）
    if (window.location.hash) {
      localStorage.setItem("sso_bind_return_hash", window.location.hash);
    }
    // 直接跳转到 SSO 登录页面
    // 在 SSO login route 中会检查 REAUTH_TOKEN，如果没有会重定向回来触发 reauth
    router.push(`/sso/${provider}/login?mode=bind&redirect_to=/settings`);
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

  // 加载会话列表
  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const result = await getSessions();
      if (result.success && result.data) {
        setSessions(result.data.sessions);
      } else {
        toast.error(result.message || "加载会话列表失败");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载会话列表失败");
    } finally {
      setSessionsLoading(false);
    }
  };

  // 执行撤销会话（不检查 reauth）
  const executeRevokeSession = async (data: { sessionId: string }) => {
    setRevokeSessionLoading(true);
    try {
      const result = await revokeSession(data);

      if (result.success) {
        toast.success(result.message);
        setShowRevokeSessionDialog(false);
        setRevokeSessionId(null);
        loadSessions(); // 重新加载会话列表
        setRevokeSessionLoading(false); // 清除 loading 状态
      } else if (needsReauth(result.error)) {
        // 需要 reauth
        pendingActionRef.current = { type: "revokeSession", data };
        openReauthWindow();
      } else {
        toast.error(result.message);
        setRevokeSessionLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "撤销会话失败");
      setRevokeSessionLoading(false);
    }
  };

  // 处理撤销会话按钮点击
  const handleRevokeSession = async () => {
    if (!revokeSessionId) {
      toast.error("未选择要撤销的会话");
      return;
    }

    await executeRevokeSession({
      sessionId: revokeSessionId,
    });
  };

  // 启用 TOTP - 第一步：生成 secret 和 QR code
  const handleEnableTotp = async () => {
    setTotpLoading(true);
    try {
      const result = await enableTotp();

      if (result.success && result.data) {
        setTotpSecret(result.data.secret);
        setTotpQrCodeUri(result.data.qrCodeUri);
        setShowTotpSetupDialog(true);
        setTotpLoading(false);
      } else if (needsReauth(result.error)) {
        // 需要 reauth
        pendingActionRef.current = null; // TOTP setup 不支持 pending action
        openReauthWindow();
      } else {
        toast.error(result.message);
        setTotpLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "启用失败");
      setTotpLoading(false);
    }
  };

  // 确认 TOTP 设置 - 第二步：验证 TOTP 码并获取备份码
  const handleConfirmTotp = async () => {
    if (!totpSetupCode || totpSetupCode.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }

    setTotpLoading(true);
    try {
      const result = await confirmTotp({ totp_code: totpSetupCode });

      if (result.success && result.data) {
        toast.success("TOTP 启用成功");
        setBackupCodes(result.data.backupCodes);
        setShowTotpSetupDialog(false);
        setShowBackupCodesDialog(true);
        setTotpSetupCode("");
        setBackupCodesConfirmed(false);
        loadTotpStatus();
        setTotpLoading(false);
      } else {
        toast.error(result.message);
        setTotpLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "确认失败");
      setTotpLoading(false);
    }
  };

  // 禁用 TOTP
  const handleDisableTotp = async () => {
    setTotpLoading(true);
    try {
      const result = await disableTotp();

      if (result.success) {
        toast.success(result.message);
        setShowTotpDisableDialog(false);
        loadTotpStatus();
        setTotpLoading(false);
      } else if (needsReauth(result.error)) {
        // 需要 reauth
        pendingActionRef.current = null; // TOTP disable 不支持 pending action
        openReauthWindow();
      } else {
        toast.error(result.message);
        setTotpLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "禁用失败");
      setTotpLoading(false);
    }
  };

  // 重新生成备份码
  const handleRegenerateBackupCodes = async () => {
    setTotpLoading(true);
    try {
      const result = await regenerateBackupCodes();

      if (result.success && result.data) {
        toast.success(result.message);
        setBackupCodes(result.data.backupCodes);
        setShowBackupCodesDialog(true);
        setBackupCodesConfirmed(false);
        loadTotpStatus();
        setTotpLoading(false);
      } else if (needsReauth(result.error)) {
        // 需要 reauth
        pendingActionRef.current = null; // 备份码重新生成不支持 pending action
        openReauthWindow();
      } else {
        toast.error(result.message);
        setTotpLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重新生成失败");
      setTotpLoading(false);
    }
  };

  // 格式化相对时间
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return "未知";

    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "刚刚";
    if (diffMin < 60) return `${diffMin} 分钟前`;
    if (diffHour < 24) return `${diffHour} 小时前`;
    if (diffDay < 30) return `${diffDay} 天前`;

    // 超过 30 天显示具体日期
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // 获取设备图标
  const getDeviceIcon = (iconName: string) => {
    switch (iconName) {
      case "RiWindowsFill":
        return <RiWindowsFill size="1.5em" />;
      case "RiAppleFill":
        return <RiAppleFill size="1.5em" />;
      case "RiAndroidFill":
        return <RiAndroidFill size="1.5em" />;
      case "RiTerminalBoxFill":
        return <RiTerminalBoxFill size="1.5em" />;
      case "RiComputerLine":
      default:
        return <RiComputerLine size="1.5em" />;
    }
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

              {/* 会话管理 */}
              {activeSection === "sessions" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-wider">
                      会话管理
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      管理你的登录会话，撤销可疑设备的访问权限
                    </p>
                  </div>

                  <div className="bg-background border border-foreground/10 rounded-sm">
                    <div className="px-6 py-4 border-b border-foreground/10 flex items-center justify-between">
                      <div>
                        <p className="text-foreground font-medium">
                          管理活跃的会话
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          查看所有登录设备并撤销可疑会话
                        </p>
                      </div>
                      <Button
                        label="刷新"
                        onClick={loadSessions}
                        variant="ghost"
                        size="sm"
                        loading={sessionsLoading}
                        disabled={sessionsLoading}
                      />
                    </div>
                    <div className="p-6">
                      <AutoResizer duration={0.3}>
                        <div>
                          <AutoTransition
                            type="fade"
                            duration={0.2}
                            initial={false}
                          >
                            {sessionsLoading ? (
                              <div
                                key="loading"
                                className="flex items-center justify-center py-12"
                              >
                                <LoadingIndicator size="md" />
                              </div>
                            ) : sessions.length === 0 ? (
                              <div
                                key="empty"
                                className="flex flex-col items-center justify-center py-12"
                              >
                                <p className="text-sm text-muted-foreground">
                                  尚未创建任何会话
                                </p>
                              </div>
                            ) : (
                              <div key="list" className="space-y-0">
                                {sessions.map((session, index) => (
                                  <div
                                    key={session.id}
                                    className={`
                                      flex items-center justify-between py-4 gap-4
                                      ${index !== sessions.length - 1 ? "border-b border-foreground/10" : ""}
                                      ${session.revokedAt ? "opacity-50" : ""}
                                    `}
                                  >
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                                        {getDeviceIcon(session.deviceIcon)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-medium text-foreground truncate">
                                            {session.displayName}
                                          </p>
                                          {session.isCurrent && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                                              当前会话
                                            </span>
                                          )}
                                          {session.revokedAt && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                                              已撤销
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-1">
                                          {session.ipLocation && (
                                            <>
                                              <span>{session.ipLocation}</span>
                                              <span className="opacity-50">
                                                ·
                                              </span>
                                            </>
                                          )}
                                          <span className="whitespace-nowrap">
                                            登录于{" "}
                                            {new Date(
                                              session.createdAt,
                                            ).toLocaleString("zh-CN", {
                                              year: "numeric",
                                              month: "2-digit",
                                              day: "2-digit",
                                            })}
                                          </span>
                                          {session.lastUsedAt && (
                                            <>
                                              <span className="opacity-50">
                                                ·
                                              </span>
                                              <span className="whitespace-nowrap">
                                                上次活跃于{" "}
                                                {formatRelativeTime(
                                                  session.lastUsedAt,
                                                )}
                                              </span>
                                            </>
                                          )}
                                          {session.revokedAt && (
                                            <>
                                              <span className="opacity-50">
                                                ·
                                              </span>
                                              <span className="whitespace-nowrap">
                                                撤销于{" "}
                                                {formatRelativeTime(
                                                  session.revokedAt,
                                                )}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {!session.isCurrent &&
                                      !session.revokedAt && (
                                        <div className="flex gap-3 flex-shrink-0">
                                          <Clickable
                                            onClick={() => {
                                              setRevokeSessionId(session.id);
                                              setShowRevokeSessionDialog(true);
                                            }}
                                            disabled={revokeSessionLoading}
                                            className="text-error transition-colors"
                                          >
                                            <RiDeleteBinLine size="1.25em" />
                                          </Clickable>
                                        </div>
                                      )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </AutoTransition>
                        </div>
                      </AutoResizer>
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

                  {/* TOTP 两步验证管理 */}
                  <div className="bg-background border border-foreground/10 rounded-sm">
                    <div className="px-6 py-4 border-b border-foreground/10">
                      <h3 className="text-lg font-medium text-foreground tracking-wider">
                        两步验证（TOTP）
                      </h3>
                    </div>
                    <div className="p-6">
                      {totpEnabled ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-foreground font-medium">
                                两步验证已启用
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                登录时需要输入验证码
                              </p>
                            </div>
                            <Button
                              label="禁用"
                              onClick={() => setShowTotpDisableDialog(true)}
                              variant="danger"
                              size="sm"
                            />
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-foreground/10">
                            <div>
                              <p className="text-foreground font-medium">
                                备份码
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                剩余 {totpBackupCodesRemaining} 个备份码
                              </p>
                            </div>
                            <Button
                              label="重新生成"
                              onClick={handleRegenerateBackupCodes}
                              variant="secondary"
                              size="sm"
                              loading={totpLoading}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-foreground font-medium">
                              未启用两步验证
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              为账户添加额外的安全保护
                            </p>
                          </div>
                          <Button
                            label="启用"
                            onClick={handleEnableTotp}
                            variant="secondary"
                            size="sm"
                            loading={totpLoading}
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
                  {passkeyEnabled && (
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
                  )}
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

        {/* 撤销会话对话框 */}
        <Dialog
          open={showRevokeSessionDialog}
          onClose={() => {
            setShowRevokeSessionDialog(false);
            setRevokeSessionId(null);
          }}
          title="撤销会话"
          size="sm"
        >
          <div className="px-6 py-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  确认撤销
                </h3>
                <p className="text-sm text-muted-foreground">
                  撤销后该设备将无法继续使用此会话访问你的账户。为保障安全，在执行操作前需要验证你的身份。
                </p>
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={() => {
                  setShowRevokeSessionDialog(false);
                  setRevokeSessionId(null);
                }}
                size="sm"
                disabled={revokeSessionLoading}
              />
              <Button
                label="确认撤销"
                variant="danger"
                onClick={handleRevokeSession}
                loading={revokeSessionLoading}
                loadingText="撤销中..."
                size="sm"
              />
            </div>
          </div>
        </Dialog>

        {/* TOTP 设置对话框 */}
        <Dialog
          open={showTotpSetupDialog}
          onClose={() => {
            if (!totpLoading) {
              setShowTotpSetupDialog(false);
              setTotpSetupCode("");
              setTotpSecret("");
              setTotpQrCodeUri("");
            }
          }}
          title="启用两步验证"
          size="md"
        >
          <div className="px-6 py-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  扫描二维码
                </h3>
                <p className="text-sm text-muted-foreground">
                  使用验证器应用（如 Google Authenticator、Microsoft
                  Authenticator）扫描下方二维码
                </p>
              </div>

              {qrCodeDataUrl && (
                <div className="flex justify-center">
                  <img
                    src={qrCodeDataUrl}
                    alt="TOTP QR Code"
                    className="w-64 h-64"
                  />
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  或手动输入以下密钥:
                </p>
                <div className="p-3 bg-foreground/5 rounded-sm">
                  <code className="text-sm font-mono text-foreground break-all">
                    {totpSecret}
                  </code>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  验证设置
                </h3>
                <p className="text-sm text-muted-foreground">
                  请输入验证器应用生成的 6 位验证码
                </p>
              </div>

              <div className="flex justify-center">
                <OtpInput
                  length={6}
                  value={totpSetupCode}
                  onChange={setTotpSetupCode}
                  disabled={totpLoading}
                  onComplete={() => {}}
                />
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={() => {
                  setShowTotpSetupDialog(false);
                  setTotpSetupCode("");
                  setTotpSecret("");
                  setTotpQrCodeUri("");
                }}
                size="sm"
                disabled={totpLoading}
              />
              <Button
                label="确认启用"
                variant="secondary"
                onClick={handleConfirmTotp}
                loading={totpLoading}
                loadingText="验证中..."
                size="sm"
              />
            </div>
          </div>
        </Dialog>

        {/* TOTP 禁用对话框 */}
        <Dialog
          open={showTotpDisableDialog}
          onClose={() => {
            if (!totpLoading) {
              setShowTotpDisableDialog(false);
            }
          }}
          title="禁用两步验证"
          size="sm"
        >
          <div className="px-6 py-6 space-y-8">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  确认禁用
                </h3>
                <p className="text-sm text-muted-foreground">
                  禁用后将降低账户安全性。为保障安全，在执行操作前需要验证你的身份。
                </p>
              </div>
            </section>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end sm:gap-4">
              <Button
                label="取消"
                variant="ghost"
                onClick={() => setShowTotpDisableDialog(false)}
                size="sm"
                disabled={totpLoading}
              />
              <Button
                label="确认禁用"
                variant="danger"
                onClick={handleDisableTotp}
                loading={totpLoading}
                loadingText="禁用中..."
                size="sm"
              />
            </div>
          </div>
        </Dialog>

        {/* 备份码展示对话框 */}
        <Dialog
          open={showBackupCodesDialog}
          onClose={() => {
            if (backupCodesConfirmed) {
              setShowBackupCodesDialog(false);
              setBackupCodes([]);
              setBackupCodesConfirmed(false);
            }
          }}
          title="备份码"
          size="md"
        >
          <div className="px-6 py-6 space-y-6">
            <section className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground tracking-wider">
                  保存备份码
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  每个备份码只能使用一次。请将这些备份码保存在安全的地方。
                  <span className="font-bold text-white">
                    这些代码只会显示一次。
                  </span>
                </p>
              </div>

              {/* 备份码网格 */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-foreground/5 rounded-sm border border-foreground/10">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="font-mono text-base text-foreground text-center py-3 px-2 bg-background rounded-sm border border-foreground/10 tracking-wider"
                  >
                    {code}
                  </div>
                ))}
              </div>
            </section>

            {/* 确认区域 */}
            <section className="space-y-4 pt-2">
              <Checkbox
                label="我已安全保存这些备份码"
                checked={backupCodesConfirmed}
                onChange={(e) => setBackupCodesConfirmed(e.target.checked)}
                size="md"
              />

              <Button
                label="确认"
                variant="secondary"
                onClick={() => {
                  setShowBackupCodesDialog(false);
                  setBackupCodes([]);
                  setBackupCodesConfirmed(false);
                }}
                size="md"
                disabled={!backupCodesConfirmed}
                fullWidth
              />
            </section>
          </div>
        </Dialog>
      </div>
    </div>
  );
}
