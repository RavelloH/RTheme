"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "@repo/shared-types/api/common";
import { usePathname, useSearchParams } from "next/navigation";

import { CaptchaButton } from "@/components/ui/CaptchaButton";
import { useNavigateWithTransition } from "@/components/ui/Link";
import { useWebPush } from "@/hooks/use-webpush";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { useToast } from "@/ui/Toast";

type SubscribeTab = "email" | "push" | "rss";

const tabOptions = [
  {
    value: "email",
    label: "邮箱订阅",
    description: "通过邮箱接收更新",
  },
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
] as Array<{
  value: SubscribeTab;
  label: string;
  description: string;
}>;

const permissionLabelMap: Record<NotificationPermission, string> = {
  granted: "已授权",
  denied: "已拒绝",
  default: "未选择",
};

interface SubscribeClientProps {
  isModal?: boolean;
  onRequestClose?: (targetPath?: string) => void;
}

export default function SubscribeClient({
  isModal = false,
  onRequestClose,
}: SubscribeClientProps) {
  const toast = useToast();
  const navigate = useNavigateWithTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<SubscribeTab>("email");
  const [email, setEmail] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rssUrl, setRssUrl] = useState("/feed.xml");
  const { isSupported, permission, subscribe, sendTestWebPush } = useWebPush();

  const syncLoginStatus = useCallback(() => {
    try {
      const raw = localStorage.getItem("user_info");
      if (!raw) {
        setIsLoggedIn(false);
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
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

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
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">
            在新的文章发布时，我们会定期向您发送通知。
          </p>
        </div>
        <Input
          label="邮箱地址"
          type="email"
          size="sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          helperText="me@example.com"
        />

        <div className="flex items-center justify-between gap-3 pt-4 border-t border-foreground/10">
          <p className="text-sm text-muted-foreground">
            您可在邮箱中随时取消订阅。
          </p>
          <CaptchaButton
            label="订阅通知"
            size="sm"
            variant="primary"
            disabled={!email.trim()}
            verificationText="正在检查"
            onClick={() => {
              // TODO: 实现邮箱订阅功能
              toast.warning("订阅失败", "还没做这个功能，再等等吧");
            }}
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
          options={tabOptions}
          columns={3}
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
