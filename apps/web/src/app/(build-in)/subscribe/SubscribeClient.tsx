"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiResponse } from "@repo/shared-types/api/common";
import { usePathname, useSearchParams } from "next/navigation";

import { subscribeMail } from "@/actions/mail-subscription";
import { CaptchaButton } from "@/components/ui/CaptchaButton";
import { useNavigateWithTransition } from "@/components/ui/Link";
import { useBroadcast, useBroadcastSender } from "@/hooks/use-broadcast";
import { useWebPush } from "@/hooks/use-webpush";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { useToast } from "@/ui/Toast";

type SubscribeTab = "email" | "push" | "rss";

const permissionLabelMap: Record<NotificationPermission, string> = {
  granted: "已授权",
  denied: "已拒绝",
  default: "未选择",
};

interface SubscribeClientProps {
  mailSubscriptionEnabled: boolean;
  mailSubscriptionAnonymousEnabled: boolean;
  mailSubscriptionCheckEnabled: boolean;
  currentUser: {
    uid: number;
    email: string;
    emailVerified: boolean;
  } | null;
  isModal?: boolean;
  onRequestClose?: (targetPath?: string) => void;
}

export default function SubscribeClient({
  mailSubscriptionEnabled,
  mailSubscriptionAnonymousEnabled,
  mailSubscriptionCheckEnabled,
  currentUser,
  isModal = false,
  onRequestClose,
}: SubscribeClientProps) {
  const toast = useToast();
  const navigate = useNavigateWithTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SubscribeTab>(
    mailSubscriptionEnabled ? "email" : "push",
  );
  const [email, setEmail] = useState(currentUser?.email || "");
  const [actionLoading, setActionLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(currentUser));
  const [currentLoginEmail, setCurrentLoginEmail] = useState(
    currentUser?.email || "",
  );
  const [captchaToken, setCaptchaToken] = useState("");
  const [rssUrl, setRssUrl] = useState("/feed.xml");
  const { isSupported, permission, subscribe, sendTestWebPush } = useWebPush();
  const { broadcast } = useBroadcastSender<{ type: string; token?: string }>();

  const subscribeTabOptions = useMemo(() => {
    const options: Array<{
      value: SubscribeTab;
      label: string;
      description: string;
    }> = [];

    if (mailSubscriptionEnabled) {
      options.push({
        value: "email",
        label: "邮箱订阅",
        description: "通过邮箱接收更新",
      });
    }

    options.push(
      {
        value: "push",
        label: "通知订阅",
        description: "通过浏览器推送接收通知",
      },
      {
        value: "rss",
        label: "RSS 订阅",
        description: "使用 RSS 阅读器订阅",
      },
    );

    return options;
  }, [mailSubscriptionEnabled]);

  const syncLoginStatus = useCallback(() => {
    try {
      const raw = localStorage.getItem("user_info");
      if (!raw) {
        setIsLoggedIn(Boolean(currentUser));
        setCurrentLoginEmail(currentUser?.email || "");
        return;
      }

      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const hasUid =
        typeof parsed.uid === "number" && Number.isFinite(parsed.uid);
      const hasUsername =
        typeof parsed.username === "string" && parsed.username.length > 0;
      const hasEmail =
        typeof parsed.email === "string" && parsed.email.length > 0;

      setIsLoggedIn(hasUid || hasUsername || hasEmail);
      setCurrentLoginEmail(
        typeof parsed.email === "string"
          ? parsed.email
          : currentUser?.email || "",
      );
    } catch {
      setIsLoggedIn(Boolean(currentUser));
      setCurrentLoginEmail(currentUser?.email || "");
    }
  }, [currentUser]);

  useBroadcast((message: { type: string; token?: string }) => {
    if (message?.type === "captcha-solved" && message.token) {
      setCaptchaToken(message.token);
    }
  });

  useBroadcast((message: { type: string }) => {
    if (message?.type === "captcha-error") {
      toast.error("安全验证失败，请刷新后重试");
    }
  });

  useEffect(() => {
    syncLoginStatus();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user_info") {
        syncLoginStatus();
      }
    };

    const handleLocalStorageUpdate = (event: Event) => {
      if (!(event instanceof CustomEvent) || !event.detail) {
        return;
      }

      const detail = event.detail as { key?: string };
      if (detail.key === "user_info") {
        syncLoginStatus();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("localStorageUpdate", handleLocalStorageUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "localStorageUpdate",
        handleLocalStorageUpdate,
      );
    };
  }, [syncLoginStatus]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRssUrl(new URL("/feed.xml", window.location.origin).toString());
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentLoginEmail) {
      setEmail(currentLoginEmail);
    }
  }, [currentLoginEmail, isLoggedIn]);

  useEffect(() => {
    if (
      !subscribeTabOptions.some((option) => option.value === activeTab) &&
      subscribeTabOptions[0]
    ) {
      setActiveTab(subscribeTabOptions[0].value);
    }
  }, [activeTab, subscribeTabOptions]);

  const buildRedirectUrl = useCallback(
    (basePath: string) => {
      const currentPath = pathname;
      const currentSearch = searchParams.toString();
      const fullPath = currentSearch
        ? `${currentPath}?${currentSearch}`
        : currentPath;

      const excludedPaths = [
        "/login",
        "/register",
        "/logout",
        "/reset-password",
        "/email-verify",
      ];
      const shouldAddRedirect = !excludedPaths.some((path) =>
        currentPath.startsWith(path),
      );

      if (shouldAddRedirect && currentPath !== "/") {
        return `${basePath}?redirect=${encodeURIComponent(fullPath)}`;
      }

      return basePath;
    },
    [pathname, searchParams],
  );

  const handleGotoLogin = useCallback(() => {
    const target = buildRedirectUrl("/login");
    if (onRequestClose) {
      onRequestClose(target);
      return;
    }
    navigate(target);
  }, [buildRedirectUrl, navigate, onRequestClose]);

  const handleGotoRegister = useCallback(() => {
    const target = buildRedirectUrl("/register");
    if (onRequestClose) {
      onRequestClose(target);
      return;
    }
    navigate(target);
  }, [buildRedirectUrl, navigate, onRequestClose]);

  const resetCaptchaState = useCallback(() => {
    setCaptchaToken("");
    void broadcast({ type: "captcha-reset" });
  }, [broadcast]);

  const handleSubscribeEmail = useCallback(async () => {
    if (!mailSubscriptionEnabled) {
      toast.error("当前未开启邮箱订阅");
      return;
    }

    if (!isLoggedIn && !mailSubscriptionAnonymousEnabled) {
      toast.error("当前站点不允许匿名订阅，请先登录");
      return;
    }

    if (!captchaToken) {
      toast.error("请先完成安全验证");
      return;
    }

    const targetEmail = email.trim();
    if (!isLoggedIn && !targetEmail) {
      toast.error("请填写邮箱地址");
      return;
    }

    setActionLoading(true);
    try {
      const result = await subscribeMail({
        email: isLoggedIn ? undefined : targetEmail,
        captcha_token: captchaToken,
      });

      if (result.success) {
        if (result.data?.status === "PENDING_VERIFY") {
          toast.success(result.message || "确认邮件已发送，请前往邮箱完成订阅");
        } else {
          toast.success(result.message || "订阅成功");
        }
        resetCaptchaState();
        return;
      }

      const isMailUnavailable =
        result.error?.code === "SERVICE_UNAVAILABLE" ||
        result.message.includes("邮件通知功能未启用") ||
        result.message.includes("未配置邮件发送服务") ||
        result.message.includes("未开启邮箱订阅");
      if (isMailUnavailable) {
        toast.error("当前未开启邮箱订阅");
      } else {
        toast.error(result.message || "订阅失败");
      }
      resetCaptchaState();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "订阅失败");
      resetCaptchaState();
    } finally {
      setActionLoading(false);
    }
  }, [
    captchaToken,
    email,
    isLoggedIn,
    mailSubscriptionAnonymousEnabled,
    mailSubscriptionEnabled,
    resetCaptchaState,
    toast,
  ]);

  const handleSubscribePush = async () => {
    if (!isLoggedIn) {
      toast.error("Web Push 通知订阅仅登录后可用");
      return;
    }

    setActionLoading(true);
    try {
      const result = (await subscribe("新设备")) as ApiResponse<{
        message: string;
      } | null>;
      if (result.success) {
        toast.success("订阅成功");
        return;
      }
      toast.error(result.message || "订阅失败");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "订阅失败");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    if (!isLoggedIn) {
      toast.error("Web Push 通知订阅仅登录后可用");
      return;
    }

    setActionLoading(true);
    try {
      const result = (await sendTestWebPush()) as ApiResponse<{
        message: string;
      } | null>;
      if (result.success) {
        toast.success(result.message || "测试通知已发送");
        return;
      }
      toast.error(result.message || "发送测试通知失败");
    } catch (error) {
      console.error(error);
      toast.error("发送测试通知失败");
    } finally {
      setActionLoading(false);
    }
  };

  const renderEmailTab = () => {
    if (!mailSubscriptionEnabled) {
      return (
        <div className="rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          当前站点暂未开启邮箱订阅。
        </div>
      );
    }

    if (!isLoggedIn && !mailSubscriptionAnonymousEnabled) {
      return (
        <div className="space-y-5">
          <div className="rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
            当前站点不允许匿名邮箱订阅，请先登录或注册账号。
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-foreground/10">
            <Button
              label="登录"
              size="sm"
              variant="ghost"
              onClick={handleGotoLogin}
            />
            <Button
              label="注册"
              size="sm"
              variant="primary"
              onClick={handleGotoRegister}
            />
          </div>
        </div>
      );
    }

    const showVerifyTip = mailSubscriptionCheckEnabled && !isLoggedIn;
    const canSubmit = isLoggedIn || Boolean(email.trim());

    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">
            在新的文章发布时，我们会向您发送更新通知。
          </p>
          {showVerifyTip ? (
            <p className="mt-1 text-xs text-muted-foreground">
              订阅后需要完成邮箱确认，确认成功后才会开始接收邮件。
            </p>
          ) : null}
        </div>

        <Input
          label="邮箱地址"
          type="email"
          size="sm"
          value={email}
          disabled={isLoggedIn}
          onChange={(e) => setEmail(e.target.value)}
          helperText={isLoggedIn ? "将使用当前登录账户邮箱" : "me@example.com"}
        />

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-foreground/10">
          <p className="text-sm text-muted-foreground">
            您可在邮件中的退订链接随时取消订阅。
          </p>
          <CaptchaButton
            label={showVerifyTip ? "发送确认邮件" : "订阅通知"}
            size="sm"
            variant="primary"
            loading={actionLoading}
            disabled={!canSubmit || actionLoading}
            verificationText="正在安全检查"
            onClick={handleSubscribeEmail}
          />
        </div>
      </div>
    );
  };

  const renderPushTab = () => {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">
            在新的文章发布时，我们会定期向您发送通知。
          </p>
        </div>
        <div>
          <AutoTransition type="fade" duration={0.18} initial={false}>
            <div
              key={`permission-${isSupported}-${permission}`}
              className="text-sm text-muted-foreground"
            >
              <p>当前浏览器{isSupported ? "支持" : "不支持"} Web Push 通知。</p>
              <p className="mt-1 text-muted-foreground">
                您{permissionLabelMap[permission]}此网站的通知权限。
              </p>
            </div>
          </AutoTransition>
        </div>

        {permission === "denied" ? (
          <div className="rounded-sm bg-error/10 px-4 py-3 text-sm">
            <p className="text-error">
              您已拒绝通知权限。请在浏览器设置中允许此网站的通知权限。
            </p>
          </div>
        ) : null}

        {!isLoggedIn ? (
          <div className="rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
            Web Push 通知订阅仅登录后可用，请先登录或注册账号。
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-4 border-t border-foreground/10">
          {isLoggedIn ? (
            <>
              <Button
                label="测试通知"
                size="sm"
                variant="ghost"
                onClick={handleSendTestPush}
                disabled={
                  !isSupported || permission === "denied" || actionLoading
                }
              />
              <Button
                label="订阅通知"
                size="sm"
                variant="primary"
                loading={actionLoading}
                onClick={handleSubscribePush}
                disabled={
                  !isSupported || permission === "denied" || actionLoading
                }
              />
            </>
          ) : (
            <>
              <Button
                label="登录"
                size="sm"
                variant="ghost"
                onClick={handleGotoLogin}
              />
              <Button
                label="注册"
                size="sm"
                variant="primary"
                onClick={handleGotoRegister}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  const renderRssTab = () => {
    return (
      <div className="space-y-5">
        <p className="text-sm text-muted-foreground">
          复制该链接并粘贴到你的 RSS 阅读器即可：
        </p>
        <a
          href={rssUrl}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-primary hover:underline break-all text-sm block"
        >
          {rssUrl}
        </a>
        <p className="text-sm text-muted-foreground">
          你也可以直接打开链接来查看 RSS 源内容。
        </p>

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-foreground/10">
          <p className="text-sm text-muted-foreground italic">
            *自动订阅可能仅在部分系统有效
          </p>
          <div className="flex items-center gap-3">
            <Button
              label="自动订阅"
              size="sm"
              variant="secondary"
              onClick={() => {
                const rssLink = document.createElement("a");
                rssLink.href = `feed://${window.location.host}/feed.xml`;
                rssLink.click();
              }}
            />
            <Button
              label="复制"
              size="sm"
              variant="primary"
              onClick={() => {
                navigator.clipboard.writeText(rssUrl);
                toast.success("RSS 链接已复制到剪贴板");
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentTab = () => {
    switch (activeTab) {
      case "email":
        return renderEmailTab();
      case "push":
        return renderPushTab();
      case "rss":
        return renderRssTab();
      default:
        return null;
    }
  };

  return (
    <div
      className={
        isModal
          ? "h-full overflow-y-auto px-6 py-5"
          : "mx-auto w-full max-w-4xl px-6 py-8 md:px-10"
      }
    >
      <div className="space-y-6">
        {isModal ? null : (
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-wider">订阅</h1>
            <p className="text-sm text-muted-foreground">
              选择你偏好的订阅方式，及时获取站点更新。
            </p>
          </div>
        )}

        <SegmentedControl
          value={activeTab}
          onChange={(tab) => setActiveTab(tab)}
          options={subscribeTabOptions}
          columns={subscribeTabOptions.length}
        />

        <AutoResizer duration={0.28}>
          <div
            className={
              isModal
                ? "px-1 py-1 md:px-2"
                : "rounded-sm border border-foreground/10 bg-background px-5 py-6 md:px-6"
            }
          >
            <AutoTransition type="fade" duration={0.2} initial={false}>
              <div key={`subscribe-tab-${activeTab}`}>{renderCurrentTab()}</div>
            </AutoTransition>
          </div>
        </AutoResizer>
      </div>
    </div>
  );
}
