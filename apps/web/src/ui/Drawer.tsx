"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  PanInfo,
  useDragControls,
} from "framer-motion";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /**
   * 初始高度（0-1 之间的比例，或者具体的像素值）
   * @default 0.4
   */
  initialHeight?: number;
  /**
   * 是否显示遮罩层
   * @default true
   */
  showBackdrop?: boolean;
}

export function Drawer({
  open,
  onClose,
  children,
  className = "",
  initialHeight = 0.4,
  showBackdrop = true,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [windowHeight, setWindowHeight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const controls = useDragControls();

  // 确保组件在客户端挂载
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setWindowHeight(window.innerHeight);
    }
    return () => setMounted(false);
  }, []);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 监听 ESC 键关闭
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

  // 重置状态
  useEffect(() => {
    if (!open) {
      setIsExpanded(false);
      y.set(0);
    }
  }, [open, y]);

  // 如果未挂载，不渲染任何内容
  if (!mounted) {
    return null;
  }

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;
    const height = windowHeight || 800; // Fallback

    // 调整阈值：距离屏幕高度的 25% 或速度超过 800
    const DISTANCE_THRESHOLD = height * 0.25;
    const VELOCITY_THRESHOLD = 800;
    const MIN_DRAG_DISTANCE = 30; // 最小有效拖动距离

    if (isExpanded) {
      // 展开状态下 (y=0)
      // 向下拖动 (offset > 0)
      const isFlickDown =
        velocity > VELOCITY_THRESHOLD && offset > MIN_DRAG_DISTANCE;
      const isDraggedDown = offset > DISTANCE_THRESHOLD;

      // 如果超过阈值 -> 回到初始状态 (折叠)
      if (isFlickDown || isDraggedDown) {
        setIsExpanded(false);
      }
    } else {
      // 初始状态下 (y = partial)
      // 向上拖动 (offset < 0) -> 展开
      const isFlickUp =
        velocity < -VELOCITY_THRESHOLD && offset < -MIN_DRAG_DISTANCE;
      const isDraggedUp = offset < -DISTANCE_THRESHOLD;

      if (isFlickUp || isDraggedUp) {
        setIsExpanded(true);
      }
      // 向下拖动 (offset > 0) -> 关闭
      else {
        const isFlickDown =
          velocity > VELOCITY_THRESHOLD && offset > MIN_DRAG_DISTANCE;
        const isDraggedDown = offset > DISTANCE_THRESHOLD;

        if (isFlickDown || isDraggedDown) {
          onClose();
        }
      }
    }
  };

  const drawerContent = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] overflow-hidden"
          ref={constraintsRef}
          style={{ pointerEvents: "none" }} // 让事件穿透到下面的遮罩
        >
          {/* 背景遮罩 */}
          {showBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              style={{ pointerEvents: "auto" }}
            />
          )}

          {/* Drawer 面板 */}
          <motion.div
            ref={containerRef}
            drag="y"
            dragControls={controls}
            // 关键逻辑：
            // 1. 未展开时：允许拖动任何部分 (dragListener=true)
            // 2. 已展开时：禁止拖动内容部分 (dragListener=false)，只能拖动 Handle（通过 Handle 的 onPointerDown 启动 controls）
            dragListener={!isExpanded}
            dragMomentum={false} // 关闭惯性，增强“跟手”感，松手即停（然后由 animate 接管 snap）
            dragElastic={0.1} // 增加阻尼感，避免“稍微一碰就飞”
            // 动态约束
            // 无论展开与否，Drawer 的 y 值都应该在 0 (全屏) 和 windowHeight (完全隐藏) 之间
            // 之前的约束 { top: -windowHeight, bottom: 0 } 是错误的，因为 y 是正值
            dragConstraints={{ top: 0, bottom: windowHeight }}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{
              y: isExpanded
                ? "0%" // 展开到底部（覆盖全屏减去 margin）
                : `${(1 - initialHeight) * 100}%`, // 初始高度位置
            }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 40, // 增加阻尼，减少回弹震荡
              stiffness: 350, // 保持响应速度
            }}
            className={`
              absolute 
              bottom-0 
              left-0 
              right-0 
              flex 
              flex-col 
              bg-background 
              rounded-t-xl 
              shadow-[0_-8px_30px_rgba(0,0,0,0.12)]
              border-t
              border-white/10
              h-full
              pointer-events-auto
              ${className}
            `}
            style={{
              height: "100%", // 占满整个高度，但通过 y 控制显示部分
            }}
          >
            {/* 拖动把手 - 始终可以触发拖动 */}
            <div
              className="flex-shrink-0 flex items-center justify-center p-4 cursor-grab active:cursor-grabbing touch-none z-10 bg-background/80 backdrop-blur-sm rounded-t-xl"
              onPointerDown={(e) => controls.start(e)}
            >
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* 内容区域 */}
            <div
              className={`
                flex-1 
                w-full 
                px-6 
                pb-8
                ${isExpanded ? "overflow-y-auto" : "overflow-hidden touch-none"}
              `}
              // 防止在非展开状态下内容区域的滚动事件冒泡干扰拖动
              // 但由于 dragListener={!isExpanded}，当未展开时，motion.div 自动监听，这里不需要特殊处理
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(drawerContent, document.body);
}
