"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MarqueeHit {
  type: "media" | "folder";
  id: number;
}

export interface UseMarqueeSelectionOptions {
  containerRef: React.RefObject<HTMLDivElement | null>;
  enabled: boolean;
  onSelectionChange: (hits: MarqueeHit[]) => void;
  isShiftHeld: boolean;
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UseMarqueeSelectionReturn {
  isSelecting: boolean;
  selectionRect: SelectionRect | null;
}

/**
 * 框选功能钩子
 * 支持在网格视图中拖动鼠标绘制选择框，自动选中框内的项目
 */
export function useMarqueeSelection({
  containerRef,
  enabled,
  onSelectionChange,
  isShiftHeld,
}: UseMarqueeSelectionOptions): UseMarqueeSelectionReturn {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(
    null,
  );

  // 起始点位置（相对于容器）
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  // 当前鼠标位置（相对于视口）
  const currentMouseRef = useRef<{ x: number; y: number } | null>(null);
  // RAF ID
  const rafIdRef = useRef<number | null>(null);
  // 自动滚动定时器
  const scrollIntervalRef = useRef<number | null>(null);
  // 上一次选中的项目（用于比较是否变化）
  const lastHitsRef = useRef<string>("");

  /**
   * 检测矩形是否与元素相交
   */
  const rectsIntersect = useCallback(
    (
      rect1: { left: number; top: number; right: number; bottom: number },
      rect2: { left: number; top: number; right: number; bottom: number },
    ): boolean => {
      return !(
        rect1.right < rect2.left ||
        rect1.left > rect2.right ||
        rect1.bottom < rect2.top ||
        rect1.top > rect2.bottom
      );
    },
    [],
  );

  /**
   * 计算选择框内的项目
   */
  const calculateHits = useCallback(
    (rect: SelectionRect): MarqueeHit[] => {
      const container = containerRef.current;
      if (!container) return [];

      const containerRect = container.getBoundingClientRect();

      // 选择框在视口中的绝对位置
      const selectionViewport = {
        left: containerRect.left + rect.x,
        top: containerRect.top + rect.y - container.scrollTop,
        right: containerRect.left + rect.x + rect.width,
        bottom: containerRect.top + rect.y + rect.height - container.scrollTop,
      };

      const hits: MarqueeHit[] = [];
      const gridItems = container.querySelectorAll("[data-grid-item]");

      gridItems.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        const itemType = item.getAttribute("data-item-type") as
          | "media"
          | "folder"
          | null;
        const itemId = item.getAttribute("data-item-id");

        if (
          itemType &&
          itemId &&
          rectsIntersect(selectionViewport, {
            left: itemRect.left,
            top: itemRect.top,
            right: itemRect.right,
            bottom: itemRect.bottom,
          })
        ) {
          hits.push({
            type: itemType,
            id: Number(itemId),
          });
        }
      });

      return hits;
    },
    [containerRef, rectsIntersect],
  );

  /**
   * 更新选择框并计算命中项
   */
  const updateSelection = useCallback(() => {
    const container = containerRef.current;
    const startPoint = startPointRef.current;
    const currentMouse = currentMouseRef.current;

    if (!container || !startPoint || !currentMouse) return;

    const containerRect = container.getBoundingClientRect();

    // 当前鼠标位置相对于容器的坐标（考虑滚动）
    const currentX = currentMouse.x - containerRect.left + container.scrollLeft;
    const currentY = currentMouse.y - containerRect.top + container.scrollTop;

    // 计算选择框的位置和尺寸
    const x = Math.min(startPoint.x, currentX);
    const y = Math.min(startPoint.y, currentY);
    const width = Math.abs(currentX - startPoint.x);
    const height = Math.abs(currentY - startPoint.y);

    const newRect = { x, y, width, height };
    setSelectionRect(newRect);

    // 计算命中项
    const hits = calculateHits(newRect);
    const hitsKey = hits.map((h) => `${h.type}-${h.id}`).join(",");

    // 只有当命中项变化时才触发回调
    if (hitsKey !== lastHitsRef.current) {
      lastHitsRef.current = hitsKey;
      onSelectionChange(hits);
    }
  }, [containerRef, calculateHits, onSelectionChange]);

  /**
   * 边缘自动滚动
   */
  const handleEdgeScroll = useCallback(() => {
    const container = containerRef.current;
    const currentMouse = currentMouseRef.current;

    if (!container || !currentMouse || !isSelecting) return;

    const containerRect = container.getBoundingClientRect();
    const edgeThreshold = 50; // 边缘阈值
    const maxScrollSpeed = 15; // 最大滚动速度

    let scrollDelta = 0;

    // 检测是否在上边缘
    if (currentMouse.y < containerRect.top + edgeThreshold) {
      const distance = containerRect.top + edgeThreshold - currentMouse.y;
      scrollDelta = -Math.min(maxScrollSpeed, distance * 0.3);
    }
    // 检测是否在下边缘
    else if (currentMouse.y > containerRect.bottom - edgeThreshold) {
      const distance = currentMouse.y - (containerRect.bottom - edgeThreshold);
      scrollDelta = Math.min(maxScrollSpeed, distance * 0.3);
    }

    if (scrollDelta !== 0) {
      container.scrollBy({ top: scrollDelta });
      // 滚动后需要更新选择框
      updateSelection();
    }
  }, [containerRef, isSelecting, updateSelection]);

  /**
   * 鼠标按下处理
   */
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!enabled) return;

      // 只响应左键
      if (e.button !== 0) return;

      const container = containerRef.current;
      if (!container) return;

      // 检查点击目标是否在网格项目内
      const target = e.target as HTMLElement;
      const gridItem = target.closest("[data-grid-item]");

      // 如果点击在网格项目上，不开始框选
      if (gridItem) return;

      // 检查是否点击在容器内
      const containerRect = container.getBoundingClientRect();
      if (
        e.clientX < containerRect.left ||
        e.clientX > containerRect.right ||
        e.clientY < containerRect.top ||
        e.clientY > containerRect.bottom
      ) {
        return;
      }

      e.preventDefault();

      // 记录起始点（相对于容器，考虑滚动）
      startPointRef.current = {
        x: e.clientX - containerRect.left + container.scrollLeft,
        y: e.clientY - containerRect.top + container.scrollTop,
      };
      currentMouseRef.current = { x: e.clientX, y: e.clientY };

      setIsSelecting(true);
      lastHitsRef.current = "";

      // 如果不是追加选择模式，先清空选择
      if (!isShiftHeld) {
        onSelectionChange([]);
      }
    },
    [enabled, containerRef, isShiftHeld, onSelectionChange],
  );

  /**
   * 鼠标移动处理
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isSelecting) return;

      currentMouseRef.current = { x: e.clientX, y: e.clientY };

      // 使用 RAF 节流更新
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          updateSelection();
          rafIdRef.current = null;
        });
      }
    },
    [isSelecting, updateSelection],
  );

  /**
   * 鼠标松开处理
   */
  const handleMouseUp = useCallback(() => {
    if (!isSelecting) return;

    setIsSelecting(false);
    setSelectionRect(null);
    startPointRef.current = null;
    currentMouseRef.current = null;
    lastHitsRef.current = "";

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, [isSelecting]);

  // 设置边缘滚动定时器
  useEffect(() => {
    if (isSelecting) {
      scrollIntervalRef.current = window.setInterval(handleEdgeScroll, 16);
    } else {
      if (scrollIntervalRef.current !== null) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current !== null) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [isSelecting, handleEdgeScroll]);

  // 添加全局事件监听
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // 在容器上监听 mousedown
    container.addEventListener("mousedown", handleMouseDown);

    // 在 window 上监听 mousemove 和 mouseup（确保拖出容器时仍能响应）
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (scrollIntervalRef.current !== null) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [enabled, containerRef, handleMouseDown, handleMouseMove, handleMouseUp]);

  return {
    isSelecting,
    selectionRect,
  };
}
