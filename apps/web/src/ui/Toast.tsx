"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiInformationLine,
} from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: ToastAction;
  progress?: number; // 进度百分比 0-100
}

interface ToastContextType {
  showToast: (
    type: ToastType,
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string; // 返回 toast ID
  success: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string; // 返回 toast ID
  error: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string; // 返回 toast ID
  warning: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string; // 返回 toast ID
  info: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string; // 返回 toast ID
  dismiss: (id: string) => void; // 手动关闭 toast
  update: (
    id: string,
    title: string,
    message?: string,
    type?: ToastType,
    progress?: number,
  ) => void; // 更新 toast 内容
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast 必须在 ToastProvider 内部使用");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (
      type: ToastType,
      title: string,
      message?: string,
      duration: number = 3000,
      action?: ToastAction,
    ): string => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = {
        id,
        type,
        title,
        message,
        duration,
        action,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        // 限制最大 toast 数量
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts);
        }
        return updated;
      });

      // 自动移除
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id; // 返回 toast ID
    },
    [maxToasts, removeToast],
  );

  const success = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
    ): string => {
      return showToast("success", title, message, duration, action);
    },
    [showToast],
  );

  const error = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
    ): string => {
      return showToast("error", title, message, duration, action);
    },
    [showToast],
  );

  const warning = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
    ): string => {
      return showToast("warning", title, message, duration, action);
    },
    [showToast],
  );

  const info = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
    ): string => {
      return showToast("info", title, message, duration, action);
    },
    [showToast],
  );

  // 手动关闭 toast
  const dismiss = useCallback(
    (id: string) => {
      removeToast(id);
    },
    [removeToast],
  );

  // 更新 toast 内容
  const update = useCallback(
    (
      id: string,
      title: string,
      message?: string,
      type?: ToastType,
      progress?: number,
    ) => {
      setToasts((prev) =>
        prev.map((toast) =>
          toast.id === id
            ? {
                ...toast,
                title,
                message,
                ...(type && { type }),
                // 始终更新 progress，即使是 undefined（用于清除进度）
                progress,
              }
            : toast,
        ),
      );
    },
    [],
  );

  return (
    <ToastContext.Provider
      value={{ showToast, success, error, warning, info, dismiss, update }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return null;
  }

  const toastContent = (
    <div className="fixed bottom-0 shadow-md left-1/2 -translate-x-1/2 z-[100] flex max-h-screen w-full max-w-[420px] flex-col-reverse gap-2 p-3 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );

  return createPortal(toastContent, document.body);
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
  canClose?: boolean;
}

// 圆形进度条组件
function CircularProgress({ progress }: { progress: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="24" height="24" className="transform -rotate-90">
      {/* 背景圆 */}
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-border"
      />
      {/* 进度圆 */}
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="text-primary transition-all duration-300"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Toast({ toast, onRemove, canClose }: ToastProps) {
  const getIcon = () => {
    // 如果有进度，显示进度条
    if (toast.progress !== undefined) {
      return (
        <div
          className="flex h-6 w-6 items-center justify-center"
          key="progress"
        >
          <CircularProgress progress={toast.progress} />
        </div>
      );
    }

    // 否则显示状态图标
    switch (toast.type) {
      case "success":
        return (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-success"
            key="success"
          >
            <RiCheckLine size="1.5em" />
          </div>
        );
      case "error":
        return (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-error"
            key="error"
          >
            <RiCloseLine size="1.5em" />
          </div>
        );
      case "warning":
        return (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-warning"
            key="warning"
          >
            <RiErrorWarningLine size="1.5em" />
          </div>
        );
      case "info":
        return (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-foreground"
            key="info"
          >
            <RiInformationLine size="1.5em" />
          </div>
        );
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        y: 20,
        scale: 0.95,
        transition: { duration: 0.2 },
      }}
      transition={{
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="
        pointer-events-auto
        group
        relative
        flex
        w-full
        items-center
        justify-between
        gap-3
        overflow-hidden
        rounded-lg
        border
        border-border
        bg-background
        p-4
        pr-6
        shadow-lg
        hover:shadow-xl
      "
      style={{
        minWidth: "356px",
        maxWidth: "420px",
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <AutoTransition className="flex-shrink-0">{getIcon()}</AutoTransition>
        <div className="flex-1 min-w-0 space-y-1">
          <AutoTransition className="text-sm font-medium text-foreground leading-tight">
            {toast.title}
          </AutoTransition>
          {toast.message && (
            <AutoTransition className="text-sm text-muted-foreground leading-snug">
              {toast.message}
            </AutoTransition>
          )}
        </div>
      </div>
      {toast.action && (
        <Button
          label={toast.action.label}
          variant="ghost"
          size="sm"
          onClick={() => {
            toast.action?.onClick();
            onRemove(toast.id);
          }}
          className="
            flex-shrink-0
            text-sm
            font-medium
            focus:outline-none
            focus:underline
          "
        ></Button>
      )}
      {canClose && (
        <button
          onClick={() => onRemove(toast.id)}
          className="
          absolute
          right-1
          top-1
          flex-shrink-0
          rounded-md
          p-1
          text-foreground/50
          opacity-0
          transition-opacity
          hover:text-foreground
          focus:opacity-100
          focus:outline-none
          focus:ring-1
          focus:ring-ring
          group-hover:opacity-100
        "
          aria-label="关闭通知"
        >
          <RiCloseLine size="1em" />
        </button>
      )}
    </motion.div>
  );
}
