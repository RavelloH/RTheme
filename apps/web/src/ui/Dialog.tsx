"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RiCloseLine } from "@remixicon/react";
import Clickable from "./Clickable";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showCloseButton?: boolean;
  dismissable?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  className = "",
  size = "md",
  showCloseButton = true,
  dismissable = true,
}: DialogProps) {
  const [mounted, setMounted] = React.useState(false);
  const [mouseDownTarget, setMouseDownTarget] =
    React.useState<EventTarget | null>(null);

  // 确保组件在客户端挂载
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 监听 ESC 键关闭对话框
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open && dismissable) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      // 禁止背景滚动
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose, dismissable]);

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: "max-w-md max-h-[60vh]",
          content: "max-h-[calc(60vh-5em)]",
        };
      case "md":
        return {
          container: "max-w-2xl max-h-[70vh]",
          content: "max-h-[calc(70vh-5em)]",
        };
      case "lg":
        return {
          container: "max-w-4xl max-h-[80vh]",
          content: "max-h-[calc(80vh-5em)]",
        };
      case "xl":
        return {
          container: "max-w-6xl max-h-[90vh]",
          content: "max-h-[calc(90vh-5em)]",
        };
      default:
        return {
          container: "max-w-2xl max-h-[70vh]",
          content: "max-h-[calc(70vh-5em)]",
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // 如果未挂载，不渲染任何内容
  if (!mounted) {
    return null;
  }

  const handleBackdropMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setMouseDownTarget(e.target);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // 只有当 mousedown 和 click 都发生在同一个目标（遮罩层）上时才关闭对话框
    if (
      e.target === e.currentTarget &&
      e.target === mouseDownTarget &&
      dismissable
    ) {
      onClose();
    }
    setMouseDownTarget(null);
  };

  const dialogContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[51] overflow-hidden">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onMouseDown={handleBackdropMouseDown}
            onClick={handleBackdropClick}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* 对话框内容容器 */}
          <div
            className="absolute inset-0 overflow-y-auto"
            onMouseDown={handleBackdropMouseDown}
            onClick={handleBackdropClick}
          >
            <div
              className="min-h-full flex items-center justify-center p-4"
              onMouseDown={handleBackdropMouseDown}
              onClick={handleBackdropClick}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className={`
                  relative
                  w-full
                  ${sizeStyles.container}
                  bg-background
                  backdrop-blur-md
                  rounded-sm
                  shadow-2xl
                  overflow-hidden
                  ${className}
                `}
              >
                {/* 头部 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                  <h2 className="text-2xl font-medium text-foreground tracking-wider">
                    {title}
                  </h2>
                  {showCloseButton && (
                    <Clickable
                      onClick={onClose}
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      <RiCloseLine size={24} />
                    </Clickable>
                  )}
                </div>

                {/* 内容区域 */}
                <div className={`overflow-y-auto ${sizeStyles.content}`}>
                  {children}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  // 使用 Portal 渲染到 body
  return createPortal(dialogContent, document.body);
}
