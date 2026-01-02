"use client";

import { useEffect, useState, useRef } from "react";
import { useNavigateWithTransition } from "@/components/Link";
import { useRouter } from "next/navigation";
import { useConsoleStore } from "@/store/console-store";
import UserAvatar from "./UserAvatar";
import { useBroadcast } from "@/hooks/use-broadcast";
import { useNotification } from "@/components/NotificationProvider";
import { AutoTransition } from "@/ui/AutoTransition";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  MenuItem,
  MenuTrigger,
  MenuContent,
  MenuAction,
  MenuSeparator,
} from "@/ui/Menu";
import {
  RiUserLine,
  RiNotification3Line,
  RiMailLine,
  RiSettings3Line,
  RiLogoutBoxLine,
  RiLoginBoxLine,
  RiUserAddLine,
} from "@remixicon/react";
import generateGradient from "@/lib/shared/gradient";
import generateComplementary from "@/lib/shared/complementary";
import { Tooltip } from "@/ui/Tooltip";

interface UnreadNoticeUpdateMessage {
  type: "unread_notice_update";
  count: number;
}

type StoredUserInfo = {
  uid?: number;
  username?: string;
  nickname?: string;
  avatar?: string | null;
  email?: string | null;
  role?: string;
  exp?: string;
  lastRefresh?: string;
};

const parseUserInfo = (raw: string | null): StoredUserInfo | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const data = parsed as Record<string, unknown>;
    const uid = typeof data.uid === "number" ? data.uid : undefined;
    const username =
      typeof data.username === "string" && data.username.trim().length > 0
        ? data.username
        : undefined;
    const nickname =
      typeof data.nickname === "string" && data.nickname.trim().length > 0
        ? data.nickname
        : undefined;
    const email =
      typeof data.email === "string" && data.email.trim().length > 0
        ? data.email
        : undefined;
    const avatar =
      typeof data.avatar === "string" || data.avatar === null
        ? data.avatar
        : null;
    const role =
      typeof data.role === "string" && data.role.trim().length > 0
        ? data.role
        : undefined;
    const exp =
      typeof data.exp === "string" && data.exp.trim().length > 0
        ? data.exp
        : undefined;
    const lastRefresh =
      typeof data.lastRefresh === "string" && data.lastRefresh.trim().length > 0
        ? data.lastRefresh
        : undefined;

    if (!username && !nickname && !email) {
      return null;
    }
    return {
      uid,
      username,
      nickname,
      avatar,
      email,
      role,
      exp,
      lastRefresh,
    };
  } catch (error) {
    console.error("Failed to parse user_info from localStorage:", error);
    return null;
  }
};

// 格式化时间差为人类可读格式
const formatTimeDiff = (milliseconds: number): string => {
  if (milliseconds <= 0) return "已过期";

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}天 ${remainingHours}小时` : `${days}天`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours}小时 ${remainingMinutes}分钟`
      : `${hours}小时`;
  }
  if (minutes > 0) {
    return `${minutes}分钟`;
  }
  return `${seconds}秒`;
};

// 计算 Token 状态信息
const calculateTokenStatus = (
  userInfo: StoredUserInfo | null,
): {
  expiresIn: string;
  nextRefreshIn: string;
} | null => {
  if (!userInfo?.exp || !userInfo?.lastRefresh) return null;

  try {
    const now = Date.now();

    // exp 可能是秒级时间戳字符串或 ISO 日期字符串
    let exp: number;
    if (/^\d+$/.test(userInfo.exp)) {
      // 如果是纯数字字符串，视为秒级时间戳
      exp = Number(userInfo.exp) * 1000;
    } else {
      // 否则尝试解析为日期字符串
      exp = new Date(userInfo.exp).getTime();
    }

    const lastRefresh = new Date(userInfo.lastRefresh).getTime();

    // 检查解析结果是否有效
    if (isNaN(exp) || isNaN(lastRefresh)) {
      return null;
    }

    const REFRESH_INTERVAL = 9 * 60 * 1000; // 9分钟
    const nextRefreshTime = lastRefresh + REFRESH_INTERVAL;

    const expiresIn = formatTimeDiff(exp - now);
    const nextRefreshIn = formatTimeDiff(nextRefreshTime - now);

    return {
      expiresIn,
      nextRefreshIn: nextRefreshTime > now ? nextRefreshIn : "即将刷新",
    };
  } catch {
    return null;
  }
};

// 登录按钮组件，包含菜单状态管理
export function LoginButton({ mainColor }: { mainColor: string }) {
  const navigate = useNavigateWithTransition();
  const router = useRouter();
  const { connectionStatus, isLeader } = useNotification();
  const [userInfo, setUserInfo] = useState<StoredUserInfo | null>(null);
  const [tokenStatus, setTokenStatus] = useState<{
    expiresIn: string;
    nextRefreshIn: string;
  } | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showNoticeAnimation, setShowNoticeAnimation] = useState(false);
  const prevUnreadCountRef = useRef<number>(0);
  const isInitialLoadRef = useRef(true);
  const pendingAnimationRef = useRef(false);
  const isLoadingCompleteRef = useRef(false); // 使用 ref 避免闭包问题
  const { isConsoleOpen } = useConsoleStore();

  // 监听页面加载完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      isLoadingCompleteRef.current = true;
      // 如果有待播放的动画，现在播放
      if (pendingAnimationRef.current) {
        pendingAnimationRef.current = false;
        setTimeout(() => {
          isInitialLoadRef.current = false;
          setShowNoticeAnimation(true);
          setTimeout(() => setShowNoticeAnimation(false), 2500);
        }, 1000);
      }
    };

    window.addEventListener("loadingComplete", handleLoadingComplete);

    // 兜底机制：3 秒后如果还没加载完成，强制设置为已完成
    const fallbackTimeout = setTimeout(() => {
      if (!isLoadingCompleteRef.current) {
        console.log("[UserInfo] Fallback: marking loading as complete");
        handleLoadingComplete();
      }
    }, 3000);

    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
      clearTimeout(fallbackTimeout);
    };
  }, []);

  // 监听未读数更新广播
  useBroadcast<UnreadNoticeUpdateMessage>((message) => {
    if (message.type === "unread_notice_update") {
      const newCount = message.count;
      const prevCount = prevUnreadCountRef.current;

      // 判断是否需要播放动画：
      // 1. 首次加载且有未读通知
      // 2. 新的未读数 > 之前的未读数（新增了通知）
      if (newCount > 0 && (isInitialLoadRef.current || newCount > prevCount)) {
        // 如果不是首次加载（用户已经在页面上），直接播放动画，无需等待 loadingComplete
        const shouldPlayImmediately =
          !isInitialLoadRef.current || isLoadingCompleteRef.current;

        if (shouldPlayImmediately) {
          // 立即播放动画
          isInitialLoadRef.current = false;
          setShowNoticeAnimation(true);
          setTimeout(() => setShowNoticeAnimation(false), 2500);
        } else {
          // 仅在首次加载时标记为待播放
          pendingAnimationRef.current = true;
        }
      }

      prevUnreadCountRef.current = newCount;
      setUnreadCount(newCount);
    }
  });

  useEffect(() => {
    const syncUserInfo = () => {
      const info = parseUserInfo(localStorage.getItem("user_info"));
      setUserInfo(info);
      setTokenStatus(calculateTokenStatus(info));
    };
    const syncUnreadCount = () => {
      try {
        const cached = localStorage.getItem("unread_notice_count");
        if (cached) {
          const data = JSON.parse(cached);
          if (typeof data.count === "number") {
            const cachedCount = data.count;
            prevUnreadCountRef.current = cachedCount;
            setUnreadCount(cachedCount);

            // 如果有未读通知，且是首次加载，标记为待播放
            if (cachedCount > 0 && isInitialLoadRef.current) {
              pendingAnimationRef.current = true;
            }
          }
        }
      } catch {
        // 忽略解析错误
      }
    };

    syncUserInfo();
    syncUnreadCount();

    // 每秒更新一次 token 状态显示
    const statusInterval = setInterval(() => {
      const info = parseUserInfo(localStorage.getItem("user_info"));
      setTokenStatus(calculateTokenStatus(info));
    }, 1000);

    // 监听跨标签页的 localStorage 变化
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user_info") {
        syncUserInfo();
      }
      // 注意：unread_notice_count 已由 NotificationProvider 通过 broadcast 同步，
      // 无需在此处理，避免与 BroadcastChannel 消息产生竞态条件
    };

    // 监听同一标签页内的 localStorage 变化（自定义事件）
    const handleLocalUpdate = (event: Event) => {
      if (event instanceof CustomEvent) {
        if (event.detail?.key === "user_info") {
          syncUserInfo();
        }
        // 注意：unread_notice_count 已由 NotificationProvider 通过 broadcast 同步
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("localStorageUpdate", handleLocalUpdate);

    return () => {
      clearInterval(statusInterval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("localStorageUpdate", handleLocalUpdate);
    };
  }, []);

  // 根据控制台状态动态调整z-index
  const getButtonZIndex = () => {
    return isConsoleOpen ? "z-[65]" : "z-auto";
  };

  return (
    <>
      <Menu orientation="vertical">
        <MenuItem value="user-menu">
          <MenuTrigger asChild>
            <button
              type="button"
              className={`flex justify-center items-center relative group transition-all duration-200 w-full h-full ${getButtonZIndex()}`}
              aria-label={userInfo ? "用户菜单" : "用户菜单"}
              style={{
                zIndex: isConsoleOpen ? 65 : "auto",
              }}
            >
              <AutoTransition
                type="scale"
                duration={1}
                className="relative w-full h-full"
              >
                {userInfo ? (
                  <div className="relative w-full h-full">
                    {/* 头像层 */}
                    <div className="overflow-hidden">
                      <UserAvatar
                        key="user-avatar"
                        username={
                          userInfo.nickname || userInfo.username || "user"
                        }
                        avatarUrl={userInfo.avatar}
                        email={userInfo.email}
                        shape="square"
                        colors={generateGradient(
                          mainColor,
                          generateComplementary(mainColor),
                          4,
                        )}
                        className={
                          "!block w-full h-full transition-all duration-200 group-hover:scale-105 group-hover:opacity-90"
                        }
                      />
                    </div>

                    {/* 未读通知叠加层 */}
                    <AutoTransition>
                      {unreadCount > 0 && (
                        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 pointer-events-none overflow-visible">
                          {/* 小红点 */}
                          <div className="relative z-20">
                            <div className="w-3 h-3 rounded-full bg-primary/70 shadow-lg" />
                          </div>

                          {/* 波纹动画 - 从右上角中心开始，仅在特定条件下播放一次 */}
                          <AnimatePresence>
                            {showNoticeAnimation && (
                              <motion.div
                                key="ripple"
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                initial={{ scale: 0, opacity: 0.8 }}
                                animate={{ scale: 60, opacity: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                              >
                                <div className="w-3 h-3 rounded-full bg-primary" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </AutoTransition>
                  </div>
                ) : (
                  <svg
                    key="default-avatar"
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-colors duration-200 w-6 h-6 group-hover:text-white group-hover:cursor-pointer"
                  >
                    <circle cx="12" cy="7" r="4" />
                    <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  </svg>
                )}
              </AutoTransition>
            </button>
          </MenuTrigger>
          <MenuContent align="end" minWidth={220}>
            {userInfo ? (
              <>
                <div className="px-3 pb-2 my-1 text-sm border-b border-border">
                  <span className="font-medium text-foreground mr-2">
                    {userInfo.nickname || userInfo.username}
                  </span>
                  {userInfo.username && userInfo.nickname && (
                    <span className="text-muted-foreground text-xs mt-0.5">
                      @{userInfo.username}
                    </span>
                  )}
                  {userInfo.email && (
                    <div className="text-muted-foreground text-xs mt-0.5">
                      {userInfo.email}
                    </div>
                  )}
                </div>
                {tokenStatus && (
                  <div className="px-3 py-2 my-1 text-xs border-b border-border">
                    <div className="space-y-1 text-muted-foreground">
                      <div className="flex justify-start items-center gap-1">
                        <span>会话有效期:</span>
                        <span className="font-medium text-foreground/80">
                          <AutoTransition>
                            {tokenStatus.expiresIn}
                          </AutoTransition>
                        </span>
                      </div>
                      <div className="flex justify-start items-center gap-1">
                        <span>令牌有效期:</span>
                        <span className="font-medium text-foreground/80">
                          <AutoTransition>
                            {tokenStatus.nextRefreshIn}
                          </AutoTransition>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                {/* WebSocket 实时通信状态 */}
                <AutoTransition type="fade" duration={0.2}>
                  {connectionStatus === "connected" && (
                    <div className="px-4 pt-2 pb-3 mb-1 text-xs border-b border-border">
                      <Tooltip
                        className="flex items-center gap-2 text-muted-foreground"
                        content="WebSocket 连接已建立，实时通知、即时通信功能正常"
                        placement="right"
                      >
                        {/* 脉冲圆点 */}
                        <div className="relative w-3 h-3 flex items-center justify-center">
                          <span
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-success opacity-75 animate-ping"
                            style={{ animationDuration: "2s" }}
                          />
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-success" />
                        </div>
                        <span className="text-success/90">
                          已与服务器建立实时通信
                        </span>
                      </Tooltip>
                    </div>
                  )}
                  {connectionStatus === "idle" && isLeader === false && (
                    <div className="px-4 pt-2 pb-3 mb-1 text-xs border-b border-border">
                      <Tooltip
                        className="flex items-center gap-2 text-muted-foreground"
                        content="其他标签页已建立 WebSocket 连接"
                        placement="right"
                      >
                        {/* 静态绿色圆点 - 无动画 */}
                        <div className="relative w-3 h-3 flex items-center justify-center">
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-success" />
                        </div>
                        <span className="text-success/90">
                          已由其他标签页建立实时通信
                        </span>
                      </Tooltip>
                    </div>
                  )}
                  {connectionStatus === "connecting" && (
                    <div className="px-4 pt-2 pb-3 mb-1 text-xs border-b border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {/* 旋转加载圆点 */}
                        <div className="relative w-3 h-3 flex items-center justify-center">
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-muted-foreground animate-pulse" />
                        </div>
                        <span>正在连接服务器...</span>
                      </div>
                    </div>
                  )}
                  {(connectionStatus === "disconnected" ||
                    connectionStatus === "suspended") && (
                    <div className="px-4 pt-2 pb-3 mb-1 text-xs border-b border-border">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {/* 警告圆点 */}
                        <div className="relative w-3 h-3 flex items-center justify-center">
                          <span
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-warning opacity-75 animate-ping"
                            style={{ animationDuration: "1.5s" }}
                          />
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-warning" />
                        </div>
                        <span className="text-warning/90">正在重新连接...</span>
                      </div>
                    </div>
                  )}
                  {connectionStatus === "failed" && (
                    <div className="px-4 pt-2 pb-3 mb-1 text-xs border-b border-border">
                      <Tooltip
                        className="flex items-center gap-2 text-muted-foreground"
                        content={
                          "无法与服务器建立 WebSocket 连接。通知及站内信可能存在延迟。"
                        }
                        placement="right"
                      >
                        {/* 错误圆点 */}
                        <div className="relative w-3 h-3 flex items-center justify-center">
                          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-error" />
                        </div>
                        <span className="text-error/90">
                          连接失败，已降级至轮询
                        </span>
                      </Tooltip>
                    </div>
                  )}
                </AutoTransition>

                <MenuAction
                  onClick={() => navigate("/profile")}
                  icon={<RiUserLine size="1.2em" />}
                >
                  个人资料
                </MenuAction>
                <MenuAction
                  onClick={() => router.push("/notifications")}
                  icon={<RiNotification3Line size="1.2em" />}
                >
                  <div className="flex items-center justify-between flex-1">
                    <span>通知</span>
                    {unreadCount > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs font-mono font-medium bg-primary/10 text-primary rounded-full">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                </MenuAction>
                <MenuAction
                  onClick={() => navigate("/messages")}
                  icon={<RiMailLine size="1.2em" />}
                >
                  私信
                </MenuAction>
                <MenuAction
                  onClick={() => navigate("/settings")}
                  icon={<RiSettings3Line size="1.2em" />}
                >
                  设置
                </MenuAction>
                <MenuSeparator />
                <MenuAction
                  onClick={() => navigate("/logout")}
                  className="text-error"
                  icon={<RiLogoutBoxLine size="1.2em" className="text-error" />}
                >
                  退出登录
                </MenuAction>
              </>
            ) : (
              <>
                <MenuAction
                  onClick={() => navigate("/login")}
                  icon={<RiLoginBoxLine size="1.2em" />}
                >
                  登录
                </MenuAction>
                <MenuAction
                  onClick={() => navigate("/register")}
                  icon={<RiUserAddLine size="1.2em" />}
                >
                  注册
                </MenuAction>
              </>
            )}
          </MenuContent>
        </MenuItem>
      </Menu>
    </>
  );
}
