"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PanInfo } from "framer-motion";
import {
  animate,
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
} from "framer-motion";

import { useMobile } from "@/hooks/use-mobile";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /**
   * 初始高度/宽度（0-1 之间的比例）
   * - 移动端：底部抽屉的高度比例，默认 0.4
   * - 桌面端：右侧侧边栏的宽度比例，默认 0.3
   */
  initialSize?: number;
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
  initialSize = 0.4,
  showBackdrop = true,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  const isMobile = useMobile();
  const effectiveInitialSize = initialSize;

  const containerRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // 移动端拖动控制
  const y = useMotionValue(0);
  const controls = useDragControls();

  // 桌面端控制
  const desktopX = useMotionValue(0);
  const desktopWidth = useMotionValue(400);

  // 确保组件在客户端挂载
  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
      desktopWidth.set(window.innerWidth * effectiveInitialSize);
    }
    return () => setMounted(false);
  }, [effectiveInitialSize, desktopWidth]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setViewportSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };
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
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  // 当 open 改变时的动画逻辑
  useEffect(() => {
    if (open) {
      // 开启时：重置宽度并执行入场动画
      if (typeof window !== "undefined") {
        const initialW = Math.max(
          300,
          window.innerWidth * effectiveInitialSize,
        );
        desktopWidth.set(initialW);
        desktopX.set(initialW); // 从右侧外面开始
        animate(desktopX, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    } else {
      // 关闭时：重置状态（AnimatePresence 会处理 exit 动画）
      setIsExpanded(false);
      y.set(0);
    }
  }, [open, effectiveInitialSize, desktopX, desktopWidth, y]);

  if (!mounted) {
    return null;
  }

  // --- 移动端底部抽屉逻辑 ---
  const handleDragEndMobile = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const offset = info.offset.y;
    const velocity = info.velocity.y;
    const height = viewportSize.height || 800;

    const DISTANCE_THRESHOLD = height * 0.25;
    const VELOCITY_THRESHOLD = 800;
    const MIN_DRAG_DISTANCE = 30;

    if (isExpanded) {
      const isFlickDown =
        velocity > VELOCITY_THRESHOLD && offset > MIN_DRAG_DISTANCE;
      const isDraggedDown = offset > DISTANCE_THRESHOLD;
      if (isFlickDown || isDraggedDown) setIsExpanded(false);
    } else {
      const isFlickUp =
        velocity < -VELOCITY_THRESHOLD && offset < -MIN_DRAG_DISTANCE;
      const isDraggedUp = offset < -DISTANCE_THRESHOLD;
      if (isFlickUp || isDraggedUp) {
        setIsExpanded(true);
      } else {
        const isFlickDown =
          velocity > VELOCITY_THRESHOLD && offset > MIN_DRAG_DISTANCE;
        const isDraggedDown = offset > DISTANCE_THRESHOLD;
        if (isFlickDown || isDraggedDown) onClose();
      }
    }
  };

  const mobileDrawerContent = (
    <motion.div
      key="mobile-drawer"
      ref={containerRef}
      drag="y"
      dragControls={controls}
      dragListener={!isExpanded}
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={{ top: 0, bottom: viewportSize.height }}
      onDragEnd={handleDragEndMobile}
      initial={{ y: "100%" }}
      animate={{
        y: isExpanded ? "0%" : `${(1 - effectiveInitialSize) * 100}%`,
      }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 40, stiffness: 350 }}
      className={`
        absolute bottom-0 left-0 right-0 flex flex-col 
        bg-background rounded-t-xl 
        shadow-[0_-8px_30px_rgba(0,0,0,0.12)]
        border-t border-white/10
        h-full pointer-events-auto
        ${className}
      `}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center p-4 cursor-grab active:cursor-grabbing touch-none z-10 bg-background/80 backdrop-blur-sm rounded-t-xl"
        onPointerDown={(e) => controls.start(e)}
      >
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
      </div>
      <div
        className={`
          flex-1 w-full px-6 pb-8
          ${isExpanded ? "overflow-y-auto" : "overflow-hidden touch-none"}
        `}
      >
        {children}
      </div>
    </motion.div>
  );

  // --- 桌面端右侧侧边栏逻辑 (Resize + Drag Close) ---
  const handleDesktopHandlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = desktopWidth.get();
    const minWidth = Math.max(300, viewportSize.width * effectiveInitialSize);

    let hasMoved = false;

    const handlePointerMove = (pe: PointerEvent) => {
      const currentX = pe.clientX;
      const deltaX = startX - currentX;

      if (Math.abs(deltaX) > 3) hasMoved = true;

      const newWidth = startWidth + deltaX;

      if (newWidth >= minWidth) {
        // Resize 模式
        desktopWidth.set(newWidth);
        desktopX.set(0);
        document.body.style.cursor = "ew-resize";
      } else {
        // Drag Close 模式
        desktopWidth.set(minWidth);
        // 基于当前拖动量计算 x 偏移
        desktopX.set(Math.max(0, minWidth - newWidth));
        document.body.style.cursor = "grabbing";
      }
    };

    const handlePointerUp = () => {
      document.body.style.cursor = "";
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);

      if (!hasMoved) {
        // 单击：直接关闭
        onClose();
        return;
      }

      // 拖拽释放逻辑
      if (desktopX.get() > 100) {
        onClose();
      } else {
        // 弹回
        animate(desktopX, 0, { type: "spring", stiffness: 300, damping: 30 });
      }
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const desktopDrawerContent = (
    <motion.div
      key="desktop-drawer"
      ref={containerRef}
      style={{
        x: desktopX,
        width: desktopWidth,
        maxWidth: "90vw",
        minWidth: "300px",
        // 关键：扩展右侧区域，解决 Spring 弹簧效果导致右侧露白的问题
        right: -200,
        paddingRight: 200,
      }}
      // 注意：这里不再设置 animate 属性，完全交给 useEffect 中的 animate(desktopX) 控制
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className={`
        absolute top-0 bottom-0
        flex flex-row
        bg-background
        border-l border-border
        shadow-[-8px_0_30px_rgba(0,0,0,0.12)]
        pointer-events-auto
        z-[51]
        ${className}
      `}
    >
      {/* 侧边拖动把手 (桌面端) */}
      <div
        className="w-6 flex-shrink-0 flex items-center justify-center cursor-ew-resize hover:bg-muted/30 transition-colors border-r border-border/50 group touch-none"
        onPointerDown={handleDesktopHandlePointerDown}
      >
        <div className="w-1.5 h-12 bg-muted-foreground/30 rounded-full group-hover:bg-primary transition-colors" />
      </div>

      {/* 内容区域 */}
      <div className="flex-1 w-full overflow-y-auto px-6 py-8">{children}</div>
    </motion.div>
  );

  const drawerContent = (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[51] overflow-hidden"
          ref={constraintsRef}
          style={{ pointerEvents: "none" }}
        >
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
          {isMobile ? mobileDrawerContent : desktopDrawerContent}
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(drawerContent, document.body);
}
