"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiInformationLine,
} from "@remixicon/react";

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
}

interface ToastContextType {
  showToast: (
    type: ToastType,
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => void;
  success: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => void;
  error: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => void;
  warning: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => void;
  info: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => void;
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
    ) => {
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
    },
    [maxToasts, removeToast],
  );

  const success = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
    ) => {
      showToast("success", title, message, duration, action);
    },
    [showToast],
  );

  const error = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
    ) => {
      showToast("error", title, message, duration, action);
    },
    [showToast],
  );

  const warning = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
    ) => {
      showToast("warning", title, message, duration, action);
    },
    [showToast],
  );

  const info = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
    ) => {
      showToast("info", title, message, duration, action);
    },
    [showToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
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
}

function Toast({ toast, onRemove }: ToastProps) {
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full text-success">
            <RiCheckLine size="2em" />
          </div>
        );
      case "error":
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full text-error">
            <RiCloseLine size="2em" />
          </div>
        );
      case "warning":
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full text-warning">
            <RiErrorWarningLine size="2em" />
          </div>
        );
      case "info":
        return (
          <div className="flex h-5 w-5 items-center justify-center rounded-full text-foreground">
            <RiInformationLine size="2em" />
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
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm font-medium text-foreground leading-tight">
            {toast.title}
          </div>
          {toast.message && (
            <div className="text-sm text-muted-foreground leading-snug">
              {toast.message}
            </div>
          )}
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick();
                onRemove(toast.id);
              }}
              className="
                mt-2
                text-sm
                font-medium
                text-primary
                hover:underline
                focus:outline-none
                focus:underline
              "
            >
              {toast.action.label}
            </button>
          )}
        </div>
      </div>
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
    </motion.div>
  );
}
