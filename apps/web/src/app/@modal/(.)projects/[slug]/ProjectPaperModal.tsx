"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

import ImageLightbox from "@/components/ui/ImageLightbox";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import type { MDXContentMessage } from "@/types/broadcast-messages";

const EXIT_DURATION_MS = 360;
const CLOSE_MAX_BACK_STEPS = 24;
const CLOSE_BACK_GUARD_TIMEOUT_MS = 1600;
const CLOSE_SCROLL_TOP_THRESHOLD = 2;
const CLOSE_SCROLL_MAX_WAIT_MS = 900;

interface ProjectPaperModalProps {
  title: string;
  toc: React.ReactNode;
  children: React.ReactNode;
}

export default function ProjectPaperModal({
  title,
  toc,
  children,
}: ProjectPaperModalProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const closeAnimationFrameRef = useRef<number | null>(null);
  const closeScrollFrameRef = useRef<number | null>(null);
  const closeScrollTimeoutRef = useRef<number | null>(null);
  const isPreparingCloseRef = useRef(false);
  const { broadcast } = useBroadcastSender<MDXContentMessage>();

  const clearCloseScrollPending = useCallback(() => {
    if (closeScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(closeScrollFrameRef.current);
      closeScrollFrameRef.current = null;
    }
    if (closeScrollTimeoutRef.current !== null) {
      window.clearTimeout(closeScrollTimeoutRef.current);
      closeScrollTimeoutRef.current = null;
    }
  }, []);

  const triggerCloseAnimation = useCallback(() => {
    if (closeAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(closeAnimationFrameRef.current);
      closeAnimationFrameRef.current = null;
    }

    closeAnimationFrameRef.current = window.requestAnimationFrame(() => {
      closeAnimationFrameRef.current = null;
      setIsClosing(true);
    });
  }, []);

  const backUntilPathnameChanged = useCallback(() => {
    if (typeof window === "undefined") {
      router.back();
      return;
    }

    const startPath = `${window.location.pathname}${window.location.search}`;
    let backSteps = 0;
    let guardTimer: number | null = null;

    function cleanup() {
      window.removeEventListener("popstate", handlePopState);
      if (guardTimer !== null) {
        window.clearTimeout(guardTimer);
        guardTimer = null;
      }
    }

    function stepBack() {
      const currentPath = `${window.location.pathname}${window.location.search}`;

      // pathname/search 已变化，说明已经离开当前 modal 路由
      if (currentPath !== startPath) {
        cleanup();
        return;
      }

      if (backSteps >= CLOSE_MAX_BACK_STEPS) {
        cleanup();
        router.back();
        return;
      }

      backSteps += 1;
      window.history.back();
    }

    function handlePopState() {
      stepBack();
    }

    window.addEventListener("popstate", handlePopState);
    guardTimer = window.setTimeout(() => {
      cleanup();
      router.back();
    }, CLOSE_BACK_GUARD_TIMEOUT_MS);

    stepBack();
  }, [router]);

  const handleClose = useCallback(() => {
    if (isClosing || isPreparingCloseRef.current) return;
    isPreparingCloseRef.current = true;
    const scrollContainer = scrollContainerRef.current;

    const getScrollTop = () => {
      if (scrollContainer) return scrollContainer.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearCloseScrollPending();
      triggerCloseAnimation();
    };

    const currentTop = getScrollTop();
    if (currentTop <= CLOSE_SCROLL_TOP_THRESHOLD) {
      finish();
      return;
    }

    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const checkReachedTop = () => {
      if (getScrollTop() <= CLOSE_SCROLL_TOP_THRESHOLD) {
        finish();
        return;
      }
      closeScrollFrameRef.current =
        window.requestAnimationFrame(checkReachedTop);
    };

    closeScrollFrameRef.current = window.requestAnimationFrame(checkReachedTop);
    closeScrollTimeoutRef.current = window.setTimeout(() => {
      finish();
    }, CLOSE_SCROLL_MAX_WAIT_MS);
  }, [clearCloseScrollPending, isClosing, triggerCloseAnimation]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [handleClose]);

  // 路径变化时重置关闭状态，避免路由缓存恢复时沿用上次 isClosing=true
  useEffect(() => {
    setIsClosing(false);
    isPreparingCloseRef.current = false;
    clearCloseScrollPending();
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (closeAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(closeAnimationFrameRef.current);
      closeAnimationFrameRef.current = null;
    }
  }, [clearCloseScrollPending, pathname]);

  useEffect(() => {
    if (!isClosing) return;
    closeTimerRef.current = window.setTimeout(() => {
      backUntilPathnameChanged();
    }, EXIT_DURATION_MS);

    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [backUntilPathnameChanged, isClosing]);

  useEffect(() => {
    return () => {
      isPreparingCloseRef.current = false;
      clearCloseScrollPending();
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (closeAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(closeAnimationFrameRef.current);
        closeAnimationFrameRef.current = null;
      }
    };
  }, [clearCloseScrollPending]);

  // 兼容 markdown 场景：在模态挂载和纸张动画完成后主动通知 PostToc 重新提取目录
  useEffect(() => {
    if (isClosing) return;

    const firstTimer = window.setTimeout(() => {
      broadcast({ type: "mdx-content-recheck" });
    }, 60);

    const secondTimer = window.setTimeout(() => {
      broadcast({ type: "mdx-content-recheck" });
    }, 520);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
    };
  }, [broadcast, isClosing, pathname]);

  return (
    <div
      ref={scrollContainerRef}
      className="fixed inset-0 z-[96] overflow-y-auto overscroll-contain"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isClosing ? 0 : 1 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="pointer-events-none relative mx-auto flex max-w-7xl items-start gap-6 px-2 pb-[4em] pt-[8em] md:px-4">
        <motion.div
          initial={{ y: "112vh", rotate: -0.8 }}
          animate={
            isClosing ? { y: "112vh", rotate: 0.4 } : { y: "0vh", rotate: 0 }
          }
          transition={
            isClosing
              ? { duration: 0.36, ease: [0.38, 0.05, 0.86, 0.28] }
              : {
                  type: "spring",
                  stiffness: 170,
                  damping: 24,
                  mass: 0.92,
                }
          }
          className="pointer-events-auto relative min-h-[132vh] min-w-0 flex-1 overflow-hidden rounded-sm border border-border/80 bg-background shadow-[0_-24px_70px_rgba(0,0,0,0.35)]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`项目详情：${title}`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent,transparent_43px,rgba(120,120,120,0.08)_44px)] opacity-60" />

          <div className="relative h-full">{children}</div>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 18 }}
          animate={isClosing ? { opacity: 0, x: 10 } : { opacity: 1, x: 0 }}
          transition={{
            duration: 0.32,
            delay: isClosing ? 0 : 0.45,
          }}
          className="pointer-events-auto sticky top-[18vh] hidden w-[17rem] self-start lg:block"
          onClick={(event) => event.stopPropagation()}
        >
          {toc}
        </motion.aside>
      </div>

      <ImageLightbox />
    </div>
  );
}
