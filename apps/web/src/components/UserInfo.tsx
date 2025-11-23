"use client";

import { useState } from "react";
import { useMobile } from "@/hooks/useMobile";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import { useConsoleStore } from "@/store/consoleStore";

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
  const { isConsoleOpen } = useConsoleStore();

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
        aria-label="登录"
        onClick={handleLoginClick}
        style={{
          zIndex: isConsoleOpen ? 65 : "auto",
        }}
      >
        <div className="relative w-6 h-6 flex flex-col justify-center items-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="absolute transition-colors duration-200 group-hover:text-white group-hover:cursor-pointer"
          >
            <circle cx="12" cy="7" r="4" />
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
        </div>
      </button>
      <LoginDialog open={isDialogOpen} onClose={handleCloseDialog} />
    </>
  );
}
