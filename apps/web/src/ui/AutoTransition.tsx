"use client";

import React, { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence, TargetAndTransition } from "framer-motion";

export type TransitionType =
  | "fade"
  | "slide"
  | "scale"
  | "slideUp"
  | "slideDown";

export interface AutoTransitionProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  type?: TransitionType;
  /** 是否在首次渲染时也播放动画 */
  initial?: boolean;
  /** 自定义动画变体 */
  customVariants?: {
    initial?: TargetAndTransition;
    animate?: TargetAndTransition;
    exit?: TargetAndTransition;
  };
}

const transitionVariants: Record<
  TransitionType,
  {
    initial: TargetAndTransition;
    animate: TargetAndTransition;
    exit: TargetAndTransition;
  }
> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
};

export function AutoTransition({
  children,
  className = "",
  duration = 0.3,
  type = "fade",
  initial = true,
  customVariants,
}: AutoTransitionProps) {
  // 追踪是否已经完成首次渲染
  const [hasRendered, setHasRendered] = useState(false);

  // 使用 useEffect 在首次渲染后设置标记
  useEffect(() => {
    if (!hasRendered) {
      setHasRendered(true);
    }
  }, [hasRendered]);

  // 使用 useMemo 优化 key 生成
  const key = useMemo(() => {
    if (!children) return "empty";

    const childArray = React.Children.toArray(children);
    const firstChild = childArray[0];

    if (React.isValidElement(firstChild) && firstChild.key) {
      return String(firstChild.key);
    }

    if (React.isValidElement(firstChild)) {
      const childType = firstChild.type;
      if (typeof childType === "string") {
        return childType;
      }
      if (typeof childType === "function") {
        // 尝试获取组件名称
        const name =
          (childType as { displayName?: string; name?: string }).displayName ||
          childType.name ||
          "component";
        return name;
      }
    }

    return typeof firstChild === "string" || typeof firstChild === "number"
      ? String(firstChild)
      : "node";
  }, [children]);

  // 选择动画变体
  const selectedVariants = customVariants || transitionVariants[type];

  // 判断是否应该播放入场动画
  const shouldAnimate = initial || hasRendered;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        className={className}
        initial={shouldAnimate ? selectedVariants.initial : false}
        animate={selectedVariants.animate}
        exit={selectedVariants.exit}
        transition={{ duration }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
