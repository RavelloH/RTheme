"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  /**
   * 触发方式
   * @default "hover"
   */
  trigger?: "hover" | "click";
  /**
   * 延迟显示（毫秒）
   * @default 200
   */
  delay?: number;
  /**
   * Tooltip 位置
   * @default "top"
   */
  placement?: "top" | "bottom" | "left" | "right";
  /**
   * 最大宽度
   * @default "min(600px, 90vw)"
   */
  maxWidth?: string;
  /**
   * 是否禁用
   * @default false
   */
  disabled?: boolean;
  /**
   * 自定义类名
   */
  className?: string;
}

export function Tooltip({
  content,
  children,
  trigger = "hover",
  delay = 200,
  placement = "top",
  maxWidth = "min(600px, 90vw)",
  disabled = false,
  className = "",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateFrameRef = useRef<number | null>(null);

  // 客户端挂载检测
  useEffect(() => {
    setMounted(true);
  }, []);

  // 计算 Tooltip 位置
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8; // Tooltip 与触发元素之间的间距

    let x = 0;
    let y = 0;

    switch (placement) {
      case "top":
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.top - tooltipRect.height - spacing;
        break;
      case "bottom":
        x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
        y = triggerRect.bottom + spacing;
        break;
      case "left":
        x = triggerRect.left - tooltipRect.width - spacing;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
      case "right":
        x = triggerRect.right + spacing;
        y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
        break;
    }

    // 边界检测，确保 Tooltip 不超出视口
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (x < 0) x = spacing;
    if (x + tooltipRect.width > viewportWidth) {
      x = viewportWidth - tooltipRect.width - spacing;
    }
    if (y < 0) y = spacing;
    if (y + tooltipRect.height > viewportHeight) {
      y = viewportHeight - tooltipRect.height - spacing;
    }

    setPosition({ x, y });
  }, [placement]);

  // 显示 Tooltip
  const showTooltip = () => {
    if (disabled || !content) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  // 隐藏 Tooltip
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 延迟隐藏，给用户时间移动到 Tooltip 上
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  // 取消隐藏（鼠标移到 Tooltip 上时）
  const cancelHide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // 切换 Tooltip（点击模式）
  const toggleTooltip = () => {
    if (disabled || !content) return;
    setIsVisible((prev) => !prev);
  };

  // 更新位置
  useEffect(() => {
    if (isVisible) {
      calculatePosition();

      // 使用 requestAnimationFrame 持续更新位置，以支持横向滚动等动态场景
      const updatePosition = () => {
        calculatePosition();
        updateFrameRef.current = requestAnimationFrame(updatePosition);
      };

      updateFrameRef.current = requestAnimationFrame(updatePosition);

      return () => {
        if (updateFrameRef.current) {
          cancelAnimationFrame(updateFrameRef.current);
        }
      };
    }
  }, [isVisible, calculatePosition]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 点击外部关闭（点击模式）
  useEffect(() => {
    if (trigger !== "click" || !isVisible) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        hideTooltip();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible, trigger]);

  const triggerProps =
    trigger === "hover"
      ? {
          onMouseEnter: showTooltip,
          onMouseLeave: hideTooltip,
          onTouchStart: toggleTooltip, // 移动设备支持
        }
      : {
          onClick: toggleTooltip,
        };

  return (
    <>
      <div
        ref={triggerRef}
        className={className || "inline-block"}
        {...triggerProps}
      >
        {children}
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isVisible && content && (
              <motion.div
                ref={tooltipRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="fixed z-[100]"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  maxWidth,
                  pointerEvents: "auto",
                }}
                onMouseEnter={cancelHide}
                onMouseLeave={hideTooltip}
              >
                <div
                  className="
                    bg-background border border-muted
                    px-3 py-2 rounded shadow-lg
                    text-sm text-foreground
                    backdrop-blur-sm
                  "
                  style={{
                    whiteSpace: "normal",
                    wordBreak: "break-word",
                    overflowWrap: "anywhere",
                    maxWidth: "100%",
                  }}
                >
                  {content}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
