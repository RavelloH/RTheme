"use client";

import { useEffect, useState } from "react";
import { useNavigateWithTransition } from "@/components/Link";
import { useConsoleStore } from "@/store/console-store";
import UserAvatar from "./UserAvatar";
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
import { AutoTransition } from "@/ui/AutoTransition";

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
  const [userInfo, setUserInfo] = useState<StoredUserInfo | null>(null);
  const [tokenStatus, setTokenStatus] = useState<{
    expiresIn: string;
    nextRefreshIn: string;
  } | null>(null);
  const { isConsoleOpen } = useConsoleStore();
  const AVATAR_SIZE = 80;

  useEffect(() => {
    const syncUserInfo = () => {
      const info = parseUserInfo(localStorage.getItem("user_info"));
      setUserInfo(info);
      setTokenStatus(calculateTokenStatus(info));
    };

    syncUserInfo();

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
    };

    // 监听同一标签页内的 localStorage 变化（自定义事件）
    const handleLocalUpdate = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.key === "user_info") {
        syncUserInfo();
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
    <Menu orientation="vertical">
      <MenuItem value="user-menu">
        <MenuTrigger asChild>
          <button
            type="button"
            className={`flex flex-col justify-center items-center w-full h-full relative group transition-all duration-200 ${getButtonZIndex()}`}
            aria-label={userInfo ? "用户菜单" : "用户菜单"}
            style={{
              zIndex: isConsoleOpen ? 65 : "auto",
            }}
          >
            <AutoTransition
              type="scale"
              duration={1}
              className="relative flex flex-col justify-center items-center overflow-hidden"
            >
              {userInfo ? (
                <UserAvatar
                  key="user-avatar"
                  username={userInfo.nickname || userInfo.username || "user"}
                  avatarUrl={userInfo.avatar}
                  email={userInfo.email}
                  shape="square"
                  size={AVATAR_SIZE}
                  colors={generateGradient(
                    mainColor,
                    generateComplementary(mainColor),
                    4,
                  )}
                  className="h-full w-full transition-transform duration-200 group-hover:scale-105"
                />
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
                        <AutoTransition>{tokenStatus.expiresIn}</AutoTransition>
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

              <MenuAction
                onClick={() => navigate("/profile")}
                icon={<RiUserLine size="1.2em" />}
              >
                个人资料
              </MenuAction>
              <MenuAction
                onClick={() => navigate("/notifications")}
                icon={<RiNotification3Line size="1.2em" />}
              >
                通知
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
  );
}
