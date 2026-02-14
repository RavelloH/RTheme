"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePathname, useSelectedLayoutSegments } from "next/navigation";

import { useBroadcast } from "@/hooks/use-broadcast";
import { useMobile } from "@/hooks/use-mobile";
import { useFooterStore } from "@/store/footer-store";

interface PageTransitionProps {
  children: React.ReactNode;
}

interface TransitionMessage {
  type: "page-transition";
  direction: "left" | "right" | "up" | "down" | "unknown";
}

type TransitionState = "idle" | "exiting" | "waiting" | "entering";

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const selectedSegments = useSelectedLayoutSegments();
  const primaryRouteKey = selectedSegments.join("/") || "__root__";
  const [currentChildren, setCurrentChildren] = useState(children);
  const [transitionState, setTransitionState] =
    useState<TransitionState>("idle");
  const [transitionDirection, setTransitionDirection] = useState<string>("");
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousPathname = useRef<string>("");
  const gsapTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const lastScrollTop = useRef<number>(0);
  const hasScrollBaseline = useRef(false);
  const hasUserScrollIntent = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const isMobile = useMobile();
  const setFooterVisible = useFooterStore((state) => state.setFooterVisible);

  // 监听首次加载完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsInitialLoadComplete(true);
    };

    // 检查是否已经加载完成
    const isAlreadyLoaded = document.body.hasAttribute("data-loading-complete");
    if (isAlreadyLoaded) {
      setIsInitialLoadComplete(true);
    }

    window.addEventListener("loadingComplete", handleLoadingComplete);
    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
    };
  }, []);

  // 监听广播消息
  useBroadcast<TransitionMessage>((message) => {
    if (message?.type === "page-transition" && transitionState === "idle") {
      const { direction } = message;
      setTransitionDirection(direction);
      previousPathname.current = pathname;
      startExitAnimation(direction);
    }
  });

  // 开始退出动画
  const startExitAnimation = (direction: string) => {
    if (!containerRef.current) return;

    setTransitionState("exiting");

    if (direction === "unknown") {
      // 透明度动画：500ms内变透明
      gsap.to(containerRef.current, {
        opacity: 0,
        duration: 0.5,
        ease: "power1.inOut",
        onComplete: () => {
          setTransitionState("waiting");
        },
      });
    } else {
      // 位移动画：先移动100px，然后立即移动到屏幕外
      const tl = gsap.timeline({
        onComplete: () => {
          setTransitionState("waiting");
        },
      });

      gsapTimelineRef.current = tl;

      const props = getDirectionProps(direction, "exit");
      const screenProps = getScreenProps(direction);

      // 第一阶段：移动100px，同时透明度变化
      tl.to(containerRef.current, {
        ...props,
        duration: 0.5,
        ease: "power1.inOut",
      })
        // 第二阶段：立即移动到屏幕外，不占用时间
        .set(containerRef.current, screenProps);
    }
  };

  // 开始进入动画
  const startEnterAnimation = useCallback(() => {
    if (!containerRef.current) return;

    setTransitionState("entering");

    if (transitionDirection === "unknown") {
      // 透明度动画：500ms内变回来
      gsap.to(containerRef.current, {
        opacity: 1,
        duration: 0.5,
        ease: "power1.inOut",
        onComplete: () => {
          setTransitionState("idle");
        },
      });
    } else {
      // 从屏幕外移动到中央，同时透明度恢复
      const tl = gsap.timeline({
        onComplete: () => {
          setTransitionState("idle");
        },
      });

      // 第一阶段：从屏幕外移动到100px位置（不占用时间，立即设置）
      const enterProps = getDirectionProps(transitionDirection, "opposite");
      tl.set(containerRef.current, enterProps)
        // 第二阶段：移动到中央，同时透明度恢复
        .to(containerRef.current, {
          x: 0,
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power1.inOut",
        });
    }
  }, [transitionDirection]);

  // 监听 pathname 变化
  useEffect(() => {
    if (
      transitionState === "waiting" &&
      pathname !== previousPathname.current
    ) {
      // pathname 变化，更新内容
      setCurrentChildren(children);

      // 延迟10ms后开始进入动画，确保DOM稳定
      const delayTimer = setTimeout(() => {
        startEnterAnimation();
      }, 10);

      return () => clearTimeout(delayTimer);
    }
  }, [
    pathname,
    primaryRouteKey,
    transitionState,
    children,
    startEnterAnimation,
  ]);

  // 兜底同步：当未进入转场流程但 pathname 已变化时，仍确保页面子树按路由重建
  useEffect(() => {
    if (transitionState !== "idle") return;
    setCurrentChildren(children);
  }, [children, primaryRouteKey, transitionState]);

  // 获取屏幕外位置属性
  const getScreenProps = (direction: string) => {
    const props: gsap.TweenVars = { opacity: 0 };

    switch (direction) {
      case "left":
        props.x = "100%"; // 移动到屏幕右边
        break;
      case "right":
        props.x = "-100%"; // 移动到屏幕左边
        break;
      case "up":
        props.y = "100%"; // 移动到屏幕下边
        break;
      case "down":
        props.y = "-100%"; // 移动到屏幕上边
        break;
    }

    return props;
  };

  // 获取方向属性
  const getDirectionProps = (direction: string, type: "exit" | "opposite") => {
    const props: gsap.TweenVars = { opacity: type === "exit" ? 0 : 0 };

    switch (direction) {
      case "left":
        // left方向：新页面从左边进入，所以当前页面向右退出
        if (type === "exit") {
          props.x = 100; // 当前页面向右移动100px
        } else {
          props.x = -100; // 新页面从左边开始位置
        }
        break;
      case "right":
        // right方向：新页面从右边进入，所以当前页面向左退出
        if (type === "exit") {
          props.x = -100; // 当前页面向左移动100px
        } else {
          props.x = 100; // 新页面从右边开始位置
        }
        break;
      case "up":
        // up方向：新页面从上边进入，所以当前页面向下退出
        if (type === "exit") {
          props.y = 100; // 当前页面向下移动100px
        } else {
          props.y = -100; // 新页面从上边开始位置
        }
        break;
      case "down":
        // down方向：新页面从下边进入，所以当前页面向上退出
        if (type === "exit") {
          props.y = -100; // 当前页面向上移动100px
        } else {
          props.y = 100; // 新页面从下边开始位置
        }
        break;
    }

    return props;
  };

  // 清理动画
  useEffect(() => {
    return () => {
      if (gsapTimelineRef.current) {
        gsapTimelineRef.current.kill();
      }
    };
  }, []);

  // 仅在检测到用户真实滚动意图后，才允许“向下滚动隐藏 footer”
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const markUserScrollIntent = () => {
      hasUserScrollIntent.current = true;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const scrollKeys = new Set([
        "Space",
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "End",
        "Home",
      ]);
      if (!scrollKeys.has(event.code)) return;

      const activeElement = document.activeElement as HTMLElement | null;
      if (!activeElement) {
        hasUserScrollIntent.current = true;
        return;
      }

      const tagName = activeElement.tagName;
      const isEditable =
        activeElement.isContentEditable ||
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        tagName === "SELECT";
      if (!isEditable) {
        hasUserScrollIntent.current = true;
      }
    };

    scrollContainer.addEventListener("wheel", markUserScrollIntent, {
      passive: true,
    });
    scrollContainer.addEventListener("touchstart", markUserScrollIntent, {
      passive: true,
    });
    document.addEventListener("keydown", handleKeyDown, { passive: true });

    return () => {
      scrollContainer.removeEventListener("wheel", markUserScrollIntent);
      scrollContainer.removeEventListener("touchstart", markUserScrollIntent);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 滚动监听，控制 footer 显示/隐藏
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // 以当前滚动位置作为基线，避免首次挂载/自动恢复滚动导致误判为“向下滚动”
    lastScrollTop.current = scrollContainer.scrollTop;
    hasScrollBaseline.current = false;

    const handleScroll = () => {
      // 首次加载完成前不处理滚动事件，避免 footer 抖动
      if (!isInitialLoadComplete) return;

      const currentScrollTop = scrollContainer.scrollTop;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;
      const scrollBottom = scrollHeight - clientHeight - currentScrollTop;

      if (!hasScrollBaseline.current) {
        hasScrollBaseline.current = true;
        lastScrollTop.current = currentScrollTop;
        return;
      }

      // 清除之前的超时
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      const scrollDelta = currentScrollTop - lastScrollTop.current;
      if (Math.abs(scrollDelta) < 6) {
        lastScrollTop.current = currentScrollTop;
        return;
      }

      // 判断滚动方向
      const isScrollingDown = scrollDelta > 0;
      const isScrollingUp = scrollDelta < 0;

      // 滚动到底部（距离底部小于50px）
      const isNearBottom = scrollBottom < 50;

      if (isScrollingDown && !isNearBottom) {
        // 仅在用户主动滚动后才隐藏，避免初始化阶段误隐藏
        if (hasUserScrollIntent.current) {
          setFooterVisible(false);
        } else {
          setFooterVisible(true);
        }
      } else if (isScrollingUp || isNearBottom) {
        // 向上滚动或到达底部：显示 footer
        setFooterVisible(true);
      }

      // 更新上次滚动位置
      lastScrollTop.current = currentScrollTop;

      // 滚动停止后一段时间，如果在顶部则显示 footer
      scrollTimeout.current = setTimeout(() => {
        if (currentScrollTop < 10) {
          setFooterVisible(true);
        }
      }, 150);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [setFooterVisible, isInitialLoadComplete]);

  // 路由切换时重置 footer 状态
  useEffect(() => {
    // 首次加载完成前不重置 footer 状态，避免抖动
    if (!isInitialLoadComplete) return;

    setFooterVisible(true);
    hasUserScrollIntent.current = false;
    lastScrollTop.current = scrollContainerRef.current?.scrollTop ?? 0;
    hasScrollBaseline.current = false;
  }, [pathname, setFooterVisible, isInitialLoadComplete]);

  return (
    <div
      ref={containerRef}
      className={`w-full ${isMobile ? "" : "h-full"} relative opacity-100`}
      // GSAP 会通过 JavaScript 设置 transform 和 opacity
      // 初始状态由 CSS 类提供
    >
      <div
        ref={scrollContainerRef}
        className={`w-full ${isMobile ? "" : "h-full overflow-y-auto"} overflow-x-hidden`}
        id="scroll-container"
        style={{ paddingBottom: isMobile ? 0 : "5em" }}
      >
        {currentChildren}
      </div>
    </div>
  );
}
