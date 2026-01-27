"use client";

import { motion } from "framer-motion";
import type { ReactNode, MouseEvent } from "react";
import { forwardRef } from "react";

interface ClickableProps {
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  className?: string;
  /**
   * 是否禁用点击
   * @default false
   */
  disabled?: boolean;
  /**
   * 启用/禁用 hover 缩放效果
   * @default true
   */
  enableHoverScale?: boolean;
  /**
   * hover 时的缩放比例
   * @default 1.1 (即 10% 放大)
   */
  hoverScale?: number;
  /**
   * 点击时的缩放比例
   * @default 0.95
   */
  tapScale?: number;
  /**
   * 动画过渡时长（秒）
   * @default 0.2
   */
  duration?: number;
}

/**
 * 可点击区域组件
 *
 * 在 hover 时会稍微放大，点击时会有点击反馈
 *
 * @example
 * ```tsx
 * <Clickable onClick={() => console.log('clicked')}>
 *   <div>Click me!</div>
 * </Clickable>
 * ```
 */
const Clickable = forwardRef<HTMLDivElement, ClickableProps>(
  (
    {
      children,
      onClick,
      className = "",
      disabled = false,
      enableHoverScale = true,
      hoverScale = 1.2,
      tapScale = 0.95,
      duration = 0.2,
    },
    ref,
  ) => {
    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      onClick?.(event);
    };

    return (
      <motion.div
        ref={ref}
        className={`${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
        onClick={handleClick}
        whileHover={
          !disabled && enableHoverScale ? { scale: hoverScale } : undefined
        }
        whileTap={!disabled ? { scale: tapScale } : undefined}
        transition={{
          duration,
          ease: "easeOut",
        }}
      >
        {children}
      </motion.div>
    );
  },
);

Clickable.displayName = "Clickable";

export default Clickable;
