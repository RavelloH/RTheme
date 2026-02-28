"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { gsap } from "gsap";

import HorizontalScrollAnimationWrapper from "@/components/client/layout/AnimationWrapper";
import { useEvent } from "@/hooks/use-event";
import { useMobile } from "@/hooks/use-mobile";
import type { HorizontalScrollProgressMessage } from "@/types/broadcast-messages";
import type { HorizontalScrollEventMap } from "@/types/horizontal-scroll-events";

interface GSAPHorizontalScrollProps {
  children: ReactNode;
  className?: string;
  scrollSpeed?: number;
  enableParallax?: boolean;
  enableFadeElements?: boolean;
  enableLineReveal?: boolean;
  snapToElements?: boolean;
  forceNativeScroll?: boolean;
  disableContentAnimation?: boolean;
}

interface LastBroadcastState {
  progress: number;
  currentX: number;
  maxScroll: number;
  containerWidth: number;
  contentWidth: number;
}

const POSITION_EPSILON = 0.5;
const PROGRESS_EPSILON = 0.0005;
const FORCE_VERTICAL_SCROLL_ATTRIBUTE = "data-force-vertical-scroll";
const VERTICAL_SCROLLABLE_OVERFLOW_VALUES = new Set([
  "auto",
  "scroll",
  "overlay",
]);

function isElementVerticallyScrollable(
  element: HTMLElement,
  cache: WeakMap<HTMLElement, boolean>,
): boolean {
  const cached = cache.get(element);
  if (cached !== undefined) return cached;

  const style = window.getComputedStyle(element);
  const hasVerticalScroll =
    VERTICAL_SCROLLABLE_OVERFLOW_VALUES.has(style.overflowY) &&
    element.scrollHeight > element.clientHeight;
  cache.set(element, hasVerticalScroll);
  return hasVerticalScroll;
}

function shouldIgnoreHorizontalWheelByNestedScroll(
  target: HTMLElement,
  boundary: HTMLElement,
  deltaY: number,
  cache: WeakMap<HTMLElement, boolean>,
): boolean {
  let element: HTMLElement | null = target;

  while (element && element !== boundary) {
    if (element.hasAttribute(FORCE_VERTICAL_SCROLL_ATTRIBUTE)) {
      return true;
    }
    if (isElementVerticallyScrollable(element, cache)) {
      const isScrollingDown = deltaY > 0;
      const isScrollingUp = deltaY < 0;
      const isAtTop = element.scrollTop === 0;
      const isAtBottom =
        element.scrollTop + element.clientHeight >= element.scrollHeight - 1;
      if ((isScrollingDown && !isAtBottom) || (isScrollingUp && !isAtTop)) {
        return true;
      }
    }
    element = element.parentElement;
  }

  return false;
}

export default function HorizontalScroll({
  children,
  className = "",
  scrollSpeed = 1,
  enableParallax = false,
  enableFadeElements = false,
  enableLineReveal = false,
  forceNativeScroll = false,
  disableContentAnimation = false,
}: GSAPHorizontalScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const targetXRef = useRef(0);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const lastBroadcastRef = useRef<LastBroadcastState>({
    progress: Number.NaN,
    currentX: Number.NaN,
    maxScroll: Number.NaN,
    containerWidth: Number.NaN,
    contentWidth: Number.NaN,
  });
  // 复用 message 对象，避免每帧创建新对象导致 GC 压力
  const reusableMessageRef = useRef<HorizontalScrollProgressMessage>({
    type: "horizontal-scroll-progress",
    progress: 0,
    currentX: 0,
    maxScroll: 0,
    containerWidth: 0,
    contentWidth: 0,
  });

  const isMobile = useMobile();
  const horizontalScrollEventStore = useEvent<HorizontalScrollEventMap>();

  const touchStateRef = useRef({
    isStarted: false,
    startX: 0,
    startY: 0,
    startTargetX: 0,
    currentX: 0,
    velocity: 0,
    lastTime: 0,
    isDragging: false,
  });

  const emitHorizontalProgress = useCallback(
    (
      currentX: number,
      maxScroll: number,
      containerWidth: number,
      contentWidth: number,
    ) => {
      const safeMaxScroll = Math.max(0, maxScroll);
      const clampedCurrentX = Math.min(0, Math.max(-safeMaxScroll, currentX));
      const progress =
        safeMaxScroll > 0
          ? Math.min(1, Math.max(0, -clampedCurrentX / safeMaxScroll))
          : 0;

      const last = lastBroadcastRef.current;
      const unchanged =
        Math.abs(last.currentX - clampedCurrentX) < POSITION_EPSILON &&
        Math.abs(last.progress - progress) < PROGRESS_EPSILON &&
        Math.abs(last.maxScroll - safeMaxScroll) < POSITION_EPSILON &&
        Math.abs(last.containerWidth - containerWidth) < POSITION_EPSILON &&
        Math.abs(last.contentWidth - contentWidth) < POSITION_EPSILON;

      if (unchanged) return;

      lastBroadcastRef.current = {
        progress,
        currentX: clampedCurrentX,
        maxScroll: safeMaxScroll,
        containerWidth,
        contentWidth,
      };

      const message = reusableMessageRef.current;
      message.progress = progress;
      message.currentX = clampedCurrentX;
      message.maxScroll = safeMaxScroll;
      message.containerWidth = containerWidth;
      message.contentWidth = contentWidth;

      horizontalScrollEventStore
        .getState()
        .emitSync("horizontal-scroll-progress", message);
    },
    [horizontalScrollEventStore],
  );

  useEffect(() => {
    if (!forceNativeScroll || isMobile) return;
    const content = contentRef.current;
    if (!content) return;

    const smoothScrollState = {
      targetScrollLeft: content.scrollLeft,
      currentScrollLeft: content.scrollLeft,
      isAnimating: false,
    };

    const sizeCache = {
      containerWidth: content.clientWidth,
      contentWidth: content.scrollWidth,
      maxScrollLeft: Math.max(0, content.scrollWidth - content.clientWidth),
    };
    let nestedScrollabilityCache = new WeakMap<HTMLElement, boolean>();

    const clampScrollLeft = (value: number) =>
      Math.max(0, Math.min(sizeCache.maxScrollLeft, value));

    const syncSizeCache = (syncStateWithDom = false) => {
      sizeCache.containerWidth = content.clientWidth;
      sizeCache.contentWidth = content.scrollWidth;
      sizeCache.maxScrollLeft = Math.max(
        0,
        sizeCache.contentWidth - sizeCache.containerWidth,
      );

      if (syncStateWithDom && !smoothScrollState.isAnimating) {
        const domScrollLeft = clampScrollLeft(content.scrollLeft);
        smoothScrollState.targetScrollLeft = domScrollLeft;
        smoothScrollState.currentScrollLeft = domScrollLeft;
        return;
      }

      smoothScrollState.targetScrollLeft = clampScrollLeft(
        smoothScrollState.targetScrollLeft,
      );
      smoothScrollState.currentScrollLeft = clampScrollLeft(
        smoothScrollState.currentScrollLeft,
      );
    };

    const emitNativeProgress = () => {
      const currentScrollLeft = clampScrollLeft(content.scrollLeft);
      emitHorizontalProgress(
        -currentScrollLeft,
        sizeCache.maxScrollLeft,
        sizeCache.containerWidth,
        sizeCache.contentWidth,
      );
    };

    const syncAndEmitNativeProgress = () => {
      syncSizeCache(true);
      emitNativeProgress();
    };

    const shouldIgnoreScroll = (target: HTMLElement, deltaY: number): boolean =>
      shouldIgnoreHorizontalWheelByNestedScroll(
        target,
        content,
        deltaY,
        nestedScrollabilityCache,
      );

    let animationFrameId: number | null = null;
    let lastFrameTime = 0;
    const animateScroll = (timestamp: number) => {
      const dt = lastFrameTime > 0 ? timestamp - lastFrameTime : 16;
      lastFrameTime = timestamp;

      const diff =
        smoothScrollState.targetScrollLeft -
        smoothScrollState.currentScrollLeft;

      if (Math.abs(diff) < 0.1) {
        smoothScrollState.currentScrollLeft =
          smoothScrollState.targetScrollLeft;
        content.scrollLeft = smoothScrollState.targetScrollLeft;
        smoothScrollState.isAnimating = false;
        lastFrameTime = 0;
        emitNativeProgress();
        return;
      }

      const lerpFactor = 1 - Math.exp((-6 * dt) / 1000);
      smoothScrollState.currentScrollLeft += diff * lerpFactor;
      content.scrollLeft = smoothScrollState.currentScrollLeft;
      animationFrameId = requestAnimationFrame(animateScroll);
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (shouldIgnoreScroll(e.target as HTMLElement, e.deltaY)) return;

      e.preventDefault();

      if (
        Math.abs(content.scrollLeft - smoothScrollState.currentScrollLeft) > 1
      ) {
        const domScrollLeft = clampScrollLeft(content.scrollLeft);
        smoothScrollState.targetScrollLeft = domScrollLeft;
        smoothScrollState.currentScrollLeft = domScrollLeft;
      }

      smoothScrollState.targetScrollLeft += e.deltaY * scrollSpeed;
      smoothScrollState.targetScrollLeft = clampScrollLeft(
        smoothScrollState.targetScrollLeft,
      );

      if (!smoothScrollState.isAnimating) {
        smoothScrollState.isAnimating = true;
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        lastFrameTime = 0;
        animationFrameId = requestAnimationFrame(animateScroll);
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    let resizeHandler: (() => void) | null = null;
    let mutationObserver: MutationObserver | null = null;
    // rAF 节流标记，避免 Observer 在动画/过渡期间每帧多次触发强制布局
    let observerRafPending = false;
    const scheduleObserverSync = () => {
      nestedScrollabilityCache = new WeakMap<HTMLElement, boolean>();
      if (!observerRafPending) {
        observerRafPending = true;
        requestAnimationFrame(() => {
          observerRafPending = false;
          syncAndEmitNativeProgress();
        });
      }
    };
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(scheduleObserverSync);
      resizeObserver.observe(content);
    } else {
      resizeHandler = scheduleObserverSync;
      window.addEventListener("resize", resizeHandler);
    }

    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver(scheduleObserverSync);
      mutationObserver.observe(content, {
        childList: true,
        subtree: true,
      });
    }

    content.addEventListener("wheel", handleWheel, { passive: false });
    content.addEventListener("scroll", emitNativeProgress, { passive: true });
    syncAndEmitNativeProgress();

    return () => {
      content.removeEventListener("wheel", handleWheel);
      content.removeEventListener("scroll", emitNativeProgress);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [forceNativeScroll, isMobile, scrollSpeed, emitHorizontalProgress]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    if (isMobile || forceNativeScroll) return;

    const initialX = (gsap.getProperty(content, "x") as number) || 0;
    targetXRef.current = initialX;

    const abortController = new AbortController();
    const { signal } = abortController;

    const ctx = gsap.context(() => {
      const sizeCache = {
        containerWidth: container.offsetWidth,
        contentWidth: content.scrollWidth,
        maxScrollLeft: Math.max(0, content.scrollWidth - container.offsetWidth),
      };
      let nestedScrollabilityCache = new WeakMap<HTMLElement, boolean>();

      const clampTargetX = (value: number) => {
        const minTargetX = -sizeCache.maxScrollLeft;
        return Math.max(minTargetX, Math.min(0, value));
      };

      const emitTransformProgress = () => {
        const currentX = (gsap.getProperty(content, "x") as number) || 0;
        emitHorizontalProgress(
          currentX,
          sizeCache.maxScrollLeft,
          sizeCache.containerWidth,
          sizeCache.contentWidth,
        );
      };

      const progressTicker = () => {
        emitTransformProgress();
      };

      let isProgressTickerActive = false;
      let tickerStopTimer: number | null = null;

      const stopProgressTicker = () => {
        if (!isProgressTickerActive) return;
        gsap.ticker.remove(progressTicker);
        isProgressTickerActive = false;
      };

      const startProgressTicker = () => {
        if (!isProgressTickerActive) {
          gsap.ticker.add(progressTicker);
          isProgressTickerActive = true;
        }
        if (tickerStopTimer !== null) {
          window.clearTimeout(tickerStopTimer);
          tickerStopTimer = null;
        }
      };

      const scheduleStopProgressTicker = () => {
        if (tickerStopTimer !== null) {
          window.clearTimeout(tickerStopTimer);
        }
        tickerStopTimer = window.setTimeout(() => {
          tickerStopTimer = null;
          if (touchStateRef.current.isDragging) return;
          if (animationRef.current?.isActive()) return;
          stopProgressTicker();
        }, 120);
      };

      const syncSizeCache = () => {
        sizeCache.containerWidth = container.offsetWidth;
        sizeCache.contentWidth = content.scrollWidth;
        sizeCache.maxScrollLeft = Math.max(
          0,
          sizeCache.contentWidth - sizeCache.containerWidth,
        );

        targetXRef.current = clampTargetX(targetXRef.current);

        const currentX = (gsap.getProperty(content, "x") as number) || 0;
        const clampedCurrentX = clampTargetX(currentX);
        if (Math.abs(clampedCurrentX - currentX) > 0.1) {
          gsap.set(content, { x: clampedCurrentX });
        }

        emitTransformProgress();
      };

      const animateToTarget = () => {
        startProgressTicker();
        if (animationRef.current) animationRef.current.kill();
        const currentX = (gsap.getProperty(content, "x") as number) || 0;
        const targetX = clampTargetX(targetXRef.current);
        targetXRef.current = targetX;
        if (Math.abs(targetX - currentX) < 0.1) {
          emitTransformProgress();
          scheduleStopProgressTicker();
          return;
        }

        animationRef.current = gsap.to(content, {
          x: targetX,
          duration: 1,
          ease: "power3.out",
          overwrite: false,
          onComplete: scheduleStopProgressTicker,
          onInterrupt: scheduleStopProgressTicker,
        });
      };

      const handleWheel = (e: WheelEvent) => {
        const target = e.target as HTMLElement;
        if (
          shouldIgnoreHorizontalWheelByNestedScroll(
            target,
            container,
            e.deltaY,
            nestedScrollabilityCache,
          )
        ) {
          return;
        }

        e.preventDefault();
        const deltaX = e.deltaY * scrollSpeed;
        const newTargetX = targetXRef.current - deltaX;
        targetXRef.current = clampTargetX(newTargetX);
        animateToTarget();
      };

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 0) return;
        const touch = e.touches[0];
        if (!touch) return;
        syncSizeCache();
        touchStateRef.current = {
          isStarted: true,
          startX: touch.clientX,
          startY: touch.clientY,
          startTargetX: targetXRef.current,
          currentX: touch.clientX,
          velocity: 0,
          lastTime: Date.now(),
          isDragging: false,
        };
        if (animationRef.current) animationRef.current.kill();
        scheduleStopProgressTicker();
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!touchStateRef.current.isStarted || e.touches.length === 0) return;
        const touch = e.touches[0];
        if (!touch) return;
        const now = Date.now();
        if (now - touchStateRef.current.lastTime < 4) return;

        const deltaX = touch.clientX - touchStateRef.current.currentX;
        const deltaY = touch.clientY - touchStateRef.current.startY;
        const horizontalDistance = Math.abs(
          touch.clientX - touchStateRef.current.startX,
        );
        const verticalDistance = Math.abs(deltaY);

        if (horizontalDistance > 10 && horizontalDistance > verticalDistance) {
          e.preventDefault();
          syncSizeCache();
          touchStateRef.current.isDragging = true;
          startProgressTicker();
          touchStateRef.current.velocity =
            deltaX / (now - touchStateRef.current.lastTime);
          const newTargetX =
            touchStateRef.current.startTargetX +
            (touch.clientX - touchStateRef.current.startX);
          targetXRef.current = clampTargetX(newTargetX);
          gsap.set(content, { x: targetXRef.current });
          touchStateRef.current.currentX = touch.clientX;
          touchStateRef.current.lastTime = now;
          emitTransformProgress();
        }
      };

      const handleTouchEnd = () => {
        if (!touchStateRef.current.isStarted) return;
        touchStateRef.current.isStarted = false;
        if (touchStateRef.current.isDragging) {
          const momentum = touchStateRef.current.velocity * 300;
          let finalX = targetXRef.current + momentum;
          finalX = clampTargetX(finalX);
          targetXRef.current = finalX;
          animateToTarget();
        } else {
          scheduleStopProgressTicker();
        }
        touchStateRef.current.isDragging = false;
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInMonacoEditor =
          target.closest('[data-monaco-editor="true"]') ||
          target.closest(".monaco-editor") ||
          target.classList?.contains("monaco-editor");

        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA" ||
          document.activeElement?.getAttribute("contenteditable") === "true" ||
          isInMonacoEditor
        ) {
          return;
        }

        let scrollDelta = 0;
        if (
          (e.code === "Space" && e.shiftKey) ||
          e.code === "ArrowLeft" ||
          e.code === "ArrowUp"
        ) {
          e.preventDefault();
          scrollDelta = 100;
        } else if (
          e.code === "Space" ||
          e.code === "ArrowRight" ||
          e.code === "ArrowDown"
        ) {
          e.preventDefault();
          scrollDelta = -100;
        }

        if (scrollDelta !== 0) {
          syncSizeCache();
          const newTargetX = targetXRef.current + scrollDelta * scrollSpeed;
          targetXRef.current = clampTargetX(newTargetX);
          animateToTarget();
        }
      };

      syncSizeCache();

      let resizeObserver: ResizeObserver | null = null;
      let mutationObserver: MutationObserver | null = null;
      // rAF 节流，避免 Observer 回调在动画/过渡期间高频触发布局
      let gsapObserverRafPending = false;
      const scheduleGsapObserverSync = () => {
        nestedScrollabilityCache = new WeakMap<HTMLElement, boolean>();
        if (!gsapObserverRafPending) {
          gsapObserverRafPending = true;
          requestAnimationFrame(() => {
            gsapObserverRafPending = false;
            syncSizeCache();
          });
        }
      };
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(scheduleGsapObserverSync);
        resizeObserver.observe(container);
        resizeObserver.observe(content);
      } else {
        window.addEventListener("resize", scheduleGsapObserverSync, { signal });
      }

      if (typeof MutationObserver !== "undefined") {
        mutationObserver = new MutationObserver(scheduleGsapObserverSync);
        mutationObserver.observe(content, {
          childList: true,
          subtree: true,
        });
      }

      container.addEventListener("wheel", handleWheel, {
        passive: false,
        signal,
      });
      container.addEventListener("touchstart", handleTouchStart, {
        passive: true,
        signal,
      });
      container.addEventListener("touchmove", handleTouchMove, {
        passive: false,
        signal,
      });
      container.addEventListener("touchend", handleTouchEnd, {
        passive: true,
        signal,
      });
      document.addEventListener("keydown", handleKeyDown, {
        passive: false,
        signal,
      });

      signal.addEventListener("abort", () => {
        if (resizeObserver) resizeObserver.disconnect();
        if (mutationObserver) mutationObserver.disconnect();
        if (tickerStopTimer !== null) {
          window.clearTimeout(tickerStopTimer);
          tickerStopTimer = null;
        }
        stopProgressTicker();
      });
    }, container);

    return () => {
      if (animationRef.current) animationRef.current.kill();
      abortController.abort();
      ctx.revert();
    };
  }, [scrollSpeed, isMobile, forceNativeScroll, emitHorizontalProgress]);

  const shouldWrapWithAnimation =
    !disableContentAnimation &&
    (enableParallax || enableFadeElements || enableLineReveal);

  return (
    <div
      ref={containerRef}
      className={"overflow-hidden " + className}
      data-horizontal-scroll-container
    >
      <div
        ref={contentRef}
        data-horizontal-scroll-content
        className={`${isMobile ? "block" : forceNativeScroll ? "flex overflow-x-auto" : "flex will-change-transform"} h-full w-full min-w-0`}
      >
        {shouldWrapWithAnimation ? (
          <HorizontalScrollAnimationWrapper
            className={`${isMobile ? "block" : "flex"} h-full w-full min-w-0`}
            enableParallax={enableParallax}
            enableFadeElements={enableFadeElements}
            enableLineReveal={enableLineReveal}
          >
            {children}
          </HorizontalScrollAnimationWrapper>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
