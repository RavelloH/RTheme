"use client";

import { useEffect, useState } from "react";
import { useMobile } from "@/hooks/useMobile";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import { useConsoleStore } from "@/store/consoleStore";
import UserAvatar from "./UserAvatar";

type StoredUserInfo = {
  username?: string;
  nickname?: string;
  avatar?: string | null;
  email?: string | null;
};

const parseUserInfo = (raw: string | null): StoredUserInfo | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const data = parsed as Record<string, unknown>;
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

    if (!username && !nickname && !email) {
      return null;
    }
    return {
      username,
      nickname,
      avatar,
      email,
    };
  } catch (error) {
    console.error("Failed to parse user_info from localStorage:", error);
    return null;
  }
};

// 登录对话框组件
function LoginDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="登录"
      size="md"
      showCloseButton={true}
    >
      <div className="p-6">
        <p className="text-muted-foreground">登录功能正在开发中...</p>
        <div className="mt-6 flex justify-end">
          <Button label="关闭" onClick={onClose} />
        </div>
      </div>
    </Dialog>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function UserInfo({ onClose: _onClose }: { onClose: () => void }) {
  const isMobile = useMobile();

  // 根据设备类型获取高度值
  const getHeaderHeight = () => (isMobile ? "6em" : "5em");

  return (
    <div
      className="bg-background w-full border-t border-border shadow-lg"
      style={{ height: `calc(60vh - ${getHeaderHeight()})` }}
    >
      用户面板
    </div>
  );
}

// 导出登录对话框和登录按钮处理函数
export { LoginDialog };

// 登录按钮组件，包含对话框状态管理
export function LoginButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
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

  const handleLoginClick = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  // 根据控制台状态动态调整z-index
  const getButtonZIndex = () => {
    return isConsoleOpen ? "z-[65]" : "z-auto";
  };

  return (
    <>
      <button
        className={`flex flex-col justify-center items-center w-full h-full relative group transition-all duration-200 ${getButtonZIndex()}`}
        aria-label={userInfo ? "用户信息" : "登录"}
        onClick={handleLoginClick}
        style={{
          zIndex: isConsoleOpen ? 65 : "auto",
        }}
      >
        <div className="relative w-full h-full flex flex-col justify-center items-center overflow-hidden">
          {userInfo ? (
            <UserAvatar
              username={userInfo.nickname || userInfo.username || "user"}
              avatarUrl={userInfo.avatar}
              email={userInfo.email}
              shape="square"
              size={AVATAR_SIZE}
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
              className="transition-colors duration-200 group-hover:text-white group-hover:cursor-pointer"
            >
              <circle cx="12" cy="7" r="4" />
              <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
          )}
        </div>
      </button>
      <LoginDialog open={isDialogOpen} onClose={handleCloseDialog} />
    </>
  );
}
