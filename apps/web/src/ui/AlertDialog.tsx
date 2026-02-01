"use client";

import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { RiAlertLine } from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/ui/Button";

export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  loading?: boolean;
}

export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "确认",
  cancelText = "取消",
  variant = "danger",
  loading = false,
}: AlertDialogProps) {
  const [mounted, setMounted] = React.useState(false);

  // 确保组件在客户端挂载
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 监听 ESC 键关闭对话框
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
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
  }, [open, onClose]);

  // 获取变体样式
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: "text-error",
          iconBg: "bg-error/10",
        };
      case "warning":
        return {
          icon: "text-warning",
          iconBg: "bg-warning/10",
        };
      case "info":
        return {
          icon: "text-primary",
          iconBg: "bg-info/10",
        };
      default:
        return {
          icon: "text-error",
          iconBg: "bg-error/10",
        };
    }
  };

  const variantStyles = getVariantStyles();

  // 将 AlertDialog variant 映射到 Button variant
  const getButtonVariant = (): "danger" | "primary" => {
    return variant === "danger" ? "danger" : "primary";
  };

  // 如果未挂载，不渲染任何内容
  if (!mounted) {
    return null;
  }

  const dialogContent = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* 对话框内容容器 */}
          <div
            className="absolute inset-0 overflow-y-auto"
            onClick={(e) => {
              // 点击容器背景（非对话框内容）时关闭对话框
              if (e.target === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div
              className="min-h-full flex items-center justify-center p-4"
              onClick={(e) => {
                // 点击 flexbox 容器背景时关闭对话框
                if (e.target === e.currentTarget) {
                  onClose();
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                onClick={(e) => e.stopPropagation()}
                className="
                  relative
                  w-full
                  max-w-md
                  bg-background
                  backdrop-blur-md
                  rounded-sm
                  shadow-2xl
                  overflow-hidden
                "
              >
                {/* 内容区域 */}
                <div className="px-6 py-6">
                  {/* 图标和标题 */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full ${variantStyles.iconBg} flex items-center justify-center`}
                    >
                      <RiAlertLine
                        size="1.5em"
                        className={variantStyles.icon}
                      />
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="text-xl font-medium text-foreground mb-2">
                        {title}
                      </h3>
                      {description && (
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      label={cancelText}
                      variant="ghost"
                      onClick={onClose}
                      size="sm"
                      disabled={loading}
                    />
                    <Button
                      label={confirmText}
                      variant={getButtonVariant()}
                      className={variant === "warning" ? "bg-warning" : ""}
                      onClick={onConfirm}
                      size="sm"
                      loading={loading}
                      loadingText="处理中..."
                    />
                  </div>
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
