"use client";

import { useEffect, useState } from "react";
import { useNavigateWithTransition } from "@/components/Link";
import { useConsoleStore } from "@/store/consoleStore";
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

type StoredUserInfo = {
  uid?: number;
  username?: string;
  nickname?: string;
  avatar?: string | null;
  email?: string | null;
  role?: string;
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
    };
  } catch (error) {
    console.error("Failed to parse user_info from localStorage:", error);
    return null;
  }
};

// 登录按钮组件，包含菜单状态管理
export function LoginButton({ mainColor }: { mainColor: string }) {
  const navigate = useNavigateWithTransition();
  const [userInfo, setUserInfo] = useState<StoredUserInfo | null>(null);
  const { isConsoleOpen } = useConsoleStore();
  const AVATAR_SIZE = 80;

  useEffect(() => {
    const syncUserInfo = () => {
      const info = parseUserInfo(localStorage.getItem("user_info"));
      setUserInfo(info);
    };

    syncUserInfo();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "user_info") {
        syncUserInfo();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
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
            <div className="relative flex flex-col justify-center items-center overflow-hidden">
              {userInfo ? (
                <UserAvatar
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
            </div>
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
