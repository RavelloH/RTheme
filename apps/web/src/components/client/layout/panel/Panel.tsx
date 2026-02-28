"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RiDeleteBinLine, RiShareForward2Line } from "@remixicon/react";
import { usePathname } from "next/navigation";

import {
  THEME_OPTION_META,
  type ThemeMode,
  useThemeTransition,
} from "@/components/client/layout/ThemeProvider";
import Link from "@/components/ui/Link";
import UserAvatar from "@/components/ui/UserAvatar";
import { useMobile } from "@/hooks/use-mobile";
import {
  clearRecentVisits,
  type RecentVisitItem,
  subscribeRecentVisits,
} from "@/lib/client/recent-visits";
import { AlertDialog } from "@/ui/AlertDialog";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { useToast } from "@/ui/Toast";

type StoredUserInfo = {
  uid?: number;
  username?: string;
  nickname?: string;
  avatar?: string | null;
  email?: string | null;
  role?: string;
  exp?: string;
  lastRefresh?: string;
  loginAt?: string;
};

type SharePreview = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  url: string;
};

const THEME_OPTIONS: ThemeMode[] = ["light", "dark"];
const EMPTY_SHARE_PREVIEW: SharePreview = {
  title: "",
  description: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  url: "",
};

const SESSION_REFRESH_INTERVAL_MS = 9 * 60 * 1000;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

function parseUserInfo(raw: string | null): StoredUserInfo | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;

    const data = parsed as Record<string, unknown>;

    return {
      username:
        typeof data.username === "string" && data.username.trim().length > 0
          ? data.username
          : undefined,
      nickname:
        typeof data.nickname === "string" && data.nickname.trim().length > 0
          ? data.nickname
          : undefined,
      avatar:
        typeof data.avatar === "string" || data.avatar === null
          ? data.avatar
          : null,
      email:
        typeof data.email === "string" && data.email.trim().length > 0
          ? data.email
          : undefined,
      role:
        typeof data.role === "string" && data.role.trim().length > 0
          ? data.role.toUpperCase()
          : undefined,
      uid: typeof data.uid === "number" ? data.uid : undefined,
      exp:
        typeof data.exp === "string" && data.exp.trim().length > 0
          ? data.exp
          : undefined,
      lastRefresh:
        typeof data.lastRefresh === "string" &&
        data.lastRefresh.trim().length > 0
          ? data.lastRefresh
          : undefined,
      loginAt:
        typeof data.loginAt === "string" && data.loginAt.trim().length > 0
          ? data.loginAt
          : undefined,
    };
  } catch {
    return null;
  }
}

function formatClockTime(date: Date): string {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatAbsoluteDateTime(value: Date | null): string {
  if (!value) return "未知";
  return value.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(milliseconds: number): string {
  if (milliseconds <= 0) return "已过期";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainHours = hours % 24;
    return remainHours > 0 ? `${days}天 ${remainHours}小时` : `${days}天`;
  }

  if (hours > 0) {
    const remainMinutes = minutes % 60;
    return remainMinutes > 0
      ? `${hours}小时 ${remainMinutes}分钟`
      : `${hours}小时`;
  }

  if (minutes > 0) return `${minutes}分钟`;
  return `${seconds}秒`;
}

function inferLoginAt(expiresAt: Date | null): Date | null {
  if (!expiresAt) return null;
  return new Date(expiresAt.getTime() - SESSION_DURATION_MS);
}

function toDayKey(value: Date | null): string {
  if (!value) return "unknown";
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimelineDay(value: Date | null): string {
  if (!value) return "--.--";
  return value.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

function formatTimelineClock(value: Date | null): string {
  if (!value) return "--:--";
  return value.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function normalizeMetaText(value?: string | null): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function resolveAbsoluteUrl(raw: string): string {
  const normalized = normalizeMetaText(raw);
  if (!normalized || typeof window === "undefined") return "";

  try {
    return new URL(normalized, window.location.origin).toString();
  } catch {
    return "";
  }
}

function queryMetaContent(selector: string): string {
  if (typeof document === "undefined") return "";
  const element = document.querySelector<HTMLMetaElement>(selector);
  return normalizeMetaText(element?.content);
}

function queryCanonicalHref(): string {
  if (typeof document === "undefined") return "";
  const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  return normalizeMetaText(link?.href);
}

function toCssBackgroundImage(url: string): string {
  const sanitized = url
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]/g, "");
  return `url("${sanitized}")`;
}

function readSharePreview(pathname: string): SharePreview {
  if (typeof window === "undefined") return EMPTY_SHARE_PREVIEW;

  const title = normalizeMetaText(document.title) || "未设置标题";
  const description =
    queryMetaContent('meta[name="description"]') ||
    queryMetaContent('meta[property="og:description"]') ||
    queryMetaContent('meta[name="twitter:description"]');
  const ogTitle = queryMetaContent('meta[property="og:title"]') || title;
  const ogDescription = queryMetaContent('meta[property="og:description"]');
  const ogImage =
    resolveAbsoluteUrl(queryMetaContent('meta[property="og:image"]')) ||
    resolveAbsoluteUrl(queryMetaContent('meta[name="twitter:image"]'));
  const url =
    resolveAbsoluteUrl(queryCanonicalHref()) ||
    resolveAbsoluteUrl(queryMetaContent('meta[property="og:url"]')) ||
    resolveAbsoluteUrl(pathname) ||
    window.location.href;

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    ogImage,
    url,
  };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <AutoTransition>
      <div key={value}>
        <p className="text-sm tracking-widest text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground truncate">{value}</p>
      </div>
    </AutoTransition>
  );
}

export function Panel({ onClose: _onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const isMobile = useMobile();
  const toast = useToast();
  const { selectedTheme, switchThemeWithMask } = useThemeTransition();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const rightScrollContainerRef = useRef<HTMLDivElement>(null);
  const [userInfo, setUserInfo] = useState<StoredUserInfo | null>(null);
  const [recentVisits, setRecentVisits] = useState<RecentVisitItem[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);
  const [showRightTopGradient, setShowRightTopGradient] = useState(false);
  const [showRightBottomGradient, setShowRightBottomGradient] = useState(false);
  const [sharePreview, setSharePreview] =
    useState<SharePreview>(EMPTY_SHARE_PREVIEW);
  const [isOgImageLoaded, setIsOgImageLoaded] = useState(false);
  const activeTheme = selectedTheme;

  const sessionInfo = useMemo(() => {
    if (!userInfo) return null;

    const expiresAt = parseDate(userInfo.exp);
    const lastRefreshAt = parseDate(userInfo.lastRefresh);
    const loginAt = parseDate(userInfo.loginAt) || inferLoginAt(expiresAt);

    const remaining =
      expiresAt !== null
        ? formatDuration(expiresAt.getTime() - now.getTime())
        : "未知";

    const nextRefreshAt =
      lastRefreshAt !== null
        ? new Date(lastRefreshAt.getTime() + SESSION_REFRESH_INTERVAL_MS)
        : null;

    const nextRefreshIn =
      nextRefreshAt !== null
        ? nextRefreshAt.getTime() <= now.getTime()
          ? "即将刷新"
          : formatDuration(nextRefreshAt.getTime() - now.getTime())
        : "未知";

    return {
      loginAt,
      expiresAt,
      lastRefreshAt,
      remaining,
      nextRefreshIn,
    };
  }, [userInfo, now]);

  const displayName = userInfo?.nickname || userInfo?.username || "访客";
  const accountHint =
    userInfo?.username && userInfo?.nickname
      ? `@${userInfo.username}`
      : userInfo?.email || "未登录";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const syncUserInfo = () => {
      setUserInfo(parseUserInfo(localStorage.getItem("user_info")));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user_info") {
        syncUserInfo();
      }
    };

    const handleLocalUpdate = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail = event.detail as { key?: string } | undefined;
      if (detail?.key === "user_info") {
        syncUserInfo();
      }
    };

    syncUserInfo();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("localStorageUpdate", handleLocalUpdate);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("localStorageUpdate", handleLocalUpdate);
    };
  }, []);

  useEffect(() => {
    return subscribeRecentVisits(setRecentVisits);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const syncSharePreview = () => {
      setSharePreview(readSharePreview(pathname || "/"));
    };

    syncSharePreview();

    const raf = window.requestAnimationFrame(syncSharePreview);
    const timer = window.setTimeout(syncSharePreview, 180);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    const imageUrl = sharePreview.ogImage;
    if (!imageUrl) {
      setIsOgImageLoaded(false);
      return;
    }

    let isCanceled = false;
    const image = new window.Image();

    setIsOgImageLoaded(false);

    image.onload = () => {
      if (!isCanceled) {
        setIsOgImageLoaded(true);
      }
    };

    image.onerror = () => {
      if (!isCanceled) {
        setIsOgImageLoaded(false);
      }
    };

    image.src = imageUrl;

    return () => {
      isCanceled = true;
    };
  }, [sharePreview.ogImage]);

  const updateScrollGradients = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const hasOverflow = scrollHeight > clientHeight + 1;
    const isNearBottom = scrollTop >= scrollHeight - clientHeight - 10;

    setShowTopGradient(hasOverflow && scrollTop > 10);
    setShowBottomGradient(hasOverflow && !isNearBottom);
  }, []);

  const handleLeftColumnScroll = useCallback(() => {
    updateScrollGradients();
  }, [updateScrollGradients]);

  const updateRightScrollGradients = useCallback(() => {
    const container = rightScrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const hasOverflow = scrollHeight > clientHeight + 1;
    const isNearBottom = scrollTop >= scrollHeight - clientHeight - 10;

    setShowRightTopGradient(hasOverflow && scrollTop > 10);
    setShowRightBottomGradient(hasOverflow && !isNearBottom);
  }, []);

  const handleRightColumnScroll = useCallback(() => {
    updateRightScrollGradients();
  }, [updateRightScrollGradients]);

  useEffect(() => {
    const syncAllScrollGradients = () => {
      updateScrollGradients();
      updateRightScrollGradients();
    };

    const raf = window.requestAnimationFrame(() => {
      syncAllScrollGradients();
    });

    const handleResize = () => {
      syncAllScrollGradients();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [
    recentVisits.length,
    isOgImageLoaded,
    sharePreview,
    userInfo,
    updateRightScrollGradients,
    updateScrollGradients,
  ]);

  const handleClearRecentVisits = () => {
    clearRecentVisits();
    setShowClearDialog(false);
    toast.success("已清空最近访问记录");
  };

  const headerHeight = isMobile ? "6em" : "5em";

  const handleSystemShare = useCallback(async () => {
    const title = normalizeMetaText(sharePreview.ogTitle || sharePreview.title);
    const text = normalizeMetaText(
      sharePreview.ogDescription || sharePreview.description,
    );
    const url =
      normalizeMetaText(sharePreview.url) ||
      (typeof window !== "undefined" ? window.location.href : "");

    if (!title && !text && !url) {
      toast.error("暂无可分享内容");
      return;
    }

    const payload: ShareData = {
      ...(title ? { title } : {}),
      ...(text ? { text } : {}),
      ...(url ? { url } : {}),
    };

    const hasNativeShare =
      typeof navigator !== "undefined" && typeof navigator.share === "function";

    if (hasNativeShare) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.clipboard?.writeText === "function"
    ) {
      try {
        await navigator.clipboard.writeText(
          url || [title, text].filter(Boolean).join("\n"),
        );
        toast.success("当前设备不支持系统分享，已复制链接");
        return;
      } catch {
        toast.error("复制失败，请手动复制内容");
        return;
      }
    }

    toast.error("分享失败，请手动复制内容");
  }, [
    sharePreview.description,
    sharePreview.ogDescription,
    sharePreview.ogTitle,
    sharePreview.title,
    sharePreview.url,
    toast,
  ]);

  return (
    <>
      <div
        className="bg-background w-full border-t border-border shadow-lg"
        style={{ height: `calc(60vh - ${headerHeight})` }}
      >
        <div className="mx-auto h-full px-6 py-5">
          <div className="grid h-full grid-cols-10 gap-4">
            <section className="col-span-6 relative min-h-0 overflow-hidden">
              <div
                className={`pointer-events-none absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-background via-background/80 to-transparent z-10 transition-opacity duration-300 ${
                  showTopGradient ? "opacity-100" : "opacity-0"
                }`}
              />
              <div
                className={`pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background via-background/80 to-transparent z-10 transition-opacity duration-300 ${
                  showBottomGradient ? "opacity-100" : "opacity-0"
                }`}
              />

              <div
                ref={scrollContainerRef}
                onScroll={handleLeftColumnScroll}
                className="h-full flex min-h-0 flex-col overflow-y-auto scrollbar-hide"
              >
                <div className="border-b border-border mx-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-sm">
                      <UserAvatar
                        username={displayName}
                        avatarUrl={userInfo?.avatar}
                        email={userInfo?.email}
                        shape="square"
                        className="w-full h-full"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg text-foreground">
                        {displayName}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {accountHint}
                      </p>
                    </div>
                  </div>

                  {userInfo && (
                    <div className="mt-4 grid grid-cols-4 gap-4 pt-4">
                      <InfoRow
                        label="登录时间"
                        value={formatAbsoluteDateTime(
                          sessionInfo?.loginAt || null,
                        )}
                      />
                      <InfoRow
                        label="会话失效"
                        value={formatAbsoluteDateTime(
                          sessionInfo?.expiresAt || null,
                        )}
                      />
                      <InfoRow
                        label="剩余有效期"
                        value={sessionInfo?.remaining || "未知"}
                      />
                      <InfoRow
                        label="上次续期"
                        value={formatAbsoluteDateTime(
                          sessionInfo?.lastRefreshAt || null,
                        )}
                      />
                    </div>
                  )}
                </div>

                <div className="flex-1 px-5 py-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm tracking-wider text-muted-foreground">
                      最近访问
                    </h3>
                    <span className="text-sm text-muted-foreground flex items-center gap-3">
                      <span>共 {recentVisits.length} 条</span>
                      <span> · </span>
                      <span className="text-error">
                        <Clickable onClick={() => setShowClearDialog(true)}>
                          <RiDeleteBinLine size="1.1em" />
                        </Clickable>
                      </span>
                    </span>
                  </div>

                  <AutoTransition>
                    {recentVisits.length === 0 ? (
                      <div
                        className="flex h-full min-h-24 items-center justify-center rounded-sm border border-dashed border-border text-sm text-muted-foreground"
                        key="empty"
                      >
                        暂无访问记录
                      </div>
                    ) : (
                      <div
                        className="space-y-0"
                        key={"list-" + recentVisits.length}
                      >
                        {recentVisits.map((item, index) => {
                          const visitedAt = parseDate(item.visitedAt);
                          const previousAt =
                            index > 0
                              ? parseDate(recentVisits[index - 1]?.visitedAt)
                              : null;
                          const showDay =
                            index === 0 ||
                            toDayKey(visitedAt) !== toDayKey(previousAt);
                          const isFirst = index === 0;
                          const isLast = index === recentVisits.length - 1;
                          const lineClass =
                            recentVisits.length <= 1
                              ? ""
                              : isFirst
                                ? "top-1/2 bottom-0"
                                : isLast
                                  ? "top-0 bottom-1/2"
                                  : "inset-y-0";

                          return (
                            <Link
                              href={item.path}
                              key={item.visitedAt}
                              className="group grid min-h-6 w-full grid-cols-[4.5rem_1rem_minmax(0,1fr)] items-center gap-x-3 text-left"
                            >
                              <div className="text-right leading-none">
                                {showDay ? (
                                  <div className="h-4 text-sm tracking-[0.18em] text-foreground">
                                    {formatTimelineDay(visitedAt)}
                                  </div>
                                ) : null}
                                <div
                                  className={`text-xs tabular-nums text-muted-foreground ${showDay ? "mt-1" : ""}`}
                                >
                                  {formatTimelineClock(visitedAt)}
                                </div>
                              </div>

                              <div className="relative flex h-full items-center justify-center">
                                {lineClass ? (
                                  <span
                                    className={`absolute left-1/2 w-px -translate-x-1/2 bg-border ${lineClass}`}
                                  />
                                ) : null}
                                <span className="relative h-2.5 w-2.5 rounded-full border border-primary/40 bg-background transition-all duration-200 group-hover:scale-110 group-hover:border-primary group-hover:bg-primary" />
                              </div>

                              <div className="min-w-0 py-3">
                                <div
                                  className="truncate text-sm leading-snug text-foreground transition-colors duration-200 group-hover:text-primary"
                                  data-fade-word
                                >
                                  {item.title}
                                </div>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </AutoTransition>
                </div>
              </div>
            </section>

            <aside className="col-span-4 relative flex min-h-0 flex-col gap-4 overflow-hidden">
              <div>
                <p className="text-7xl font-bold text-foreground border-b border-border pb-2">
                  <AutoTransition>
                    {mounted ? formatClockTime(now) : "--:--"}
                  </AutoTransition>
                </p>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                <div
                  className={`pointer-events-none absolute top-0 left-0 right-0 z-10 h-6 bg-gradient-to-b from-background via-background/80 to-transparent transition-opacity duration-300 ${
                    showRightTopGradient ? "opacity-100" : "opacity-0"
                  }`}
                />
                <div
                  className={`pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-6 bg-gradient-to-t from-background via-background/80 to-transparent transition-opacity duration-300 ${
                    showRightBottomGradient ? "opacity-100" : "opacity-0"
                  }`}
                />

                <div
                  ref={rightScrollContainerRef}
                  onScroll={handleRightColumnScroll}
                  className="h-full overflow-y-auto scrollbar-hide"
                >
                  <div className="flex min-h-full flex-col gap-4 pr-1">
                    <div>
                      <div className="my-1 grid grid-cols-2 gap-2">
                        {THEME_OPTIONS.map((optionValue) => {
                          const optionMeta = THEME_OPTION_META[optionValue];
                          const Icon = optionMeta.icon;
                          const active = mounted && activeTheme === optionValue;

                          return (
                            <button
                              key={optionValue}
                              type="button"
                              onClick={(event) =>
                                switchThemeWithMask(
                                  optionValue,
                                  event.currentTarget,
                                )
                              }
                              disabled={!mounted}
                              className={`px-2 py-2 text-sm transition-colors ${
                                active
                                  ? " bg-primary text-primary-foreground"
                                  : "text-foreground hover:bg-foreground/5"
                              } disabled:cursor-not-allowed disabled:opacity-65`}
                            >
                              <span className="flex items-center justify-center gap-1.5">
                                <Icon size="1.1em" />
                                {optionMeta.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <AutoTransition>
                      <section
                        className="min-h-0 border-t border-border pt-4"
                        key={"share-preview-" + pathname}
                      >
                        <div className="overflow-hidden space-y-3">
                          <div className="space-y-1">
                            <p className="line-clamp-1 text-sm text-foreground">
                              {sharePreview.ogTitle ||
                                sharePreview.title ||
                                "未设置标题"}
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {sharePreview.url || "--"}
                            </p>
                            <p className="line-clamp-3 text-xs text-muted-foreground">
                              {sharePreview.ogDescription ||
                                sharePreview.description ||
                                "未设置描述"}
                            </p>
                          </div>

                          <AutoResizer>
                            <Clickable
                              onClick={handleSystemShare}
                              hoverScale={1}
                              className="group relative w-full overflow-hidden rounded-md border border-border text-left"
                              aria-label="分享当前页面"
                            >
                              <div className="aspect-[1.91/1] border-border border rounded-md">
                                <div
                                  className={`h-full w-full rounded-md bg-cover bg-center bg-no-repeat transition-transform duration-300`}
                                  style={
                                    isOgImageLoaded
                                      ? {
                                          backgroundImage: toCssBackgroundImage(
                                            sharePreview.ogImage,
                                          ),
                                        }
                                      : undefined
                                  }
                                >
                                  {!isOgImageLoaded ? (
                                    <div className="flex h-full items-center justify-center bg-background text-xs">
                                      <LoadingIndicator />
                                    </div>
                                  ) : null}
                                </div>

                                <div className="pointer-events-none absolute inset-0 rounded-md bg-black/0 transition-colors duration-200 group-hover:bg-black/45" />
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                    <RiShareForward2Line size="5em" />
                                  </span>
                                </div>
                              </div>
                            </Clickable>
                          </AutoResizer>
                        </div>
                      </section>
                    </AutoTransition>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <AlertDialog
        open={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearRecentVisits}
        title="确认清空最近访问记录？"
        description="此操作将删除控制中心保存的本地访问时间线，无法恢复。"
        confirmText="确认清空"
        cancelText="取消"
        variant="danger"
      />
    </>
  );
}
