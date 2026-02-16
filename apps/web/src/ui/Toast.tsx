"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  RiCheckLine,
  RiCloseLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiLoader4Line,
} from "@remixicon/react";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
} from "framer-motion";

import { AutoTransition } from "@/ui/AutoTransition";
import { Button } from "@/ui/Button";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

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
    progress?: number,
  ) => string;
  success: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string;
  error: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string;
  warning: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string;
  info: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
  ) => string;
  loading: (
    title: string,
    message?: string,
    duration?: number,
    action?: ToastAction,
    progress?: number,
  ) => string;
  dismiss: (id: string) => void;
  persist: (id: string) => void;
  update: (
    id: string,
    title: string,
    message?: string,
    type?: ToastType,
    progress?: number,
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
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timers.current.has(id)) {
      clearTimeout(timers.current.get(id)!);
      timers.current.delete(id);
    }
  }, []);

  const persist = useCallback((id: string) => {
    if (timers.current.has(id)) {
      clearTimeout(timers.current.get(id)!);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (
      type: ToastType,
      title: string,
      message?: string,
      duration: number = 3000,
      action?: ToastAction,
      progress?: number,
    ): string => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const newToast: ToastMessage = {
        id,
        type,
        title,
        message,
        duration,
        action,
        progress,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        if (updated.length > maxToasts) {
          return updated.slice(-maxToasts);
        }
        return updated;
      });

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timers.current.set(id, timer);
      }

      return id;
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

  const loading = useCallback(
    (
      title: string,
      message?: string,
      duration?: number,
      action?: ToastAction,
      progress?: number,
    ): string => {
      return showToast("loading", title, message, duration, action, progress);
    },
    [showToast],
  );

  const dismiss = useCallback(
    (id: string) => {
      removeToast(id);
    },
    [removeToast],
  );

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
      value={{
        showToast,
        success,
        error,
        warning,
        info,
        loading,
        dismiss,
        persist,
        update,
      }}
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

  const content = (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end items-center gap-2 p-3 pointer-events-none">
      <AnimatePresence initial={false} mode="popLayout">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  );

  return createPortal(content, document.body);
}

interface ToastProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
  canClose?: boolean;
}

function CircularProgress({ progress }: { progress: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width="24" height="24" className="transform -rotate-90">
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        className="text-border"
      />
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
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragOpacity = useMotionValue(1);
  const [isDragging, setIsDragging] = useState(false);
  const [exitCustom, setExitCustom] = useState<{
    x?: number;
    y?: number;
    opacity?: number;
    scale?: number;
  } | null>(null);

  const updateDragOpacity = useCallback(() => {
    const threshold = 100;
    const xProgress = Math.min(Math.abs(x.get()) / threshold, 1);
    const yProgress = Math.min(Math.abs(y.get()) / threshold, 1);
    dragOpacity.set(1 - Math.max(xProgress, yProgress));
  }, [x, y, dragOpacity]);

  const getIcon = () => {
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
      case "loading":
        return (
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-primary"
            key="loading"
          >
            <RiLoader4Line className="animate-spin" size="1.5em" />
          </div>
        );
    }
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{
        opacity: isDragging ? dragOpacity.get() : 1,
        y: 0,
        scale: 1,
      }}
      exit={
        exitCustom || {
          opacity: 0,
          y: 20,
          scale: 0.95,
        }
      }
      style={{
        x,
        y,
        minWidth: "356px",
        maxWidth: "420px",
      }}
      drag
      dragDirectionLock
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragStart={() => setIsDragging(true)}
      onDrag={() => {
        updateDragOpacity();
      }}
      onDragEnd={(event, info) => {
        setIsDragging(false);
        const { offset } = info;
        const swipeThreshold = 100;

        // Horizontal Dismiss (Left/Right)
        if (Math.abs(offset.x) > swipeThreshold) {
          setExitCustom({
            x: offset.x > 0 ? 500 : -500,
            opacity: 0,
          });
          setTimeout(() => onRemove(toast.id), 0);
          return;
        }

        // Vertical Dismiss (Up)
        if (offset.y < -swipeThreshold) {
          setExitCustom({
            y: -500,
            opacity: 0,
          });
          setTimeout(() => onRemove(toast.id), 0);
          return;
        }

        // Vertical Dismiss (Down)
        if (offset.y > swipeThreshold) {
          setExitCustom({
            y: 500,
            opacity: 0,
          });
          setTimeout(() => onRemove(toast.id), 0);
          return;
        }

        // 复位透明度和位置
        animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
        animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
        animate(dragOpacity, 1, {
          type: "spring",
          stiffness: 300,
          damping: 30,
        });
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
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
        touch-none
      "
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
