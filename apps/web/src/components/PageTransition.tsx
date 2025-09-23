"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useBroadcast } from "@/hooks/useBroadcast";
import { usePathname } from "next/navigation";
import gsap from "gsap";

interface PageTransitionProps {
  children: React.ReactNode;
}

interface TransitionMessage {
  type: "page-transition";
  direction: "left" | "right" | "up" | "down" | "unknown";
}

type TransitionState = "idle" | "exiting" | "waiting" | "entering";

export default function PageTransition({ children }: PageTransitionProps) {
  const [currentChildren, setCurrentChildren] = useState(children);
  const [transitionState, setTransitionState] =
    useState<TransitionState>("idle");
  const [transitionDirection, setTransitionDirection] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const previousPathname = useRef<string>("");
  const gsapTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const pathname = usePathname();

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
        ease: "power2.inOut",
        onComplete: () => {
          setTransitionState("waiting");
        },
      });
    } else {
      // 位移动画：500ms内移动到目标方向
      const tl = gsap.timeline({
        onComplete: () => {
          // 动画完成后，立即无动画设置到相反方向
          setPositionToOpposite(direction);
          setTransitionState("waiting");
        },
      });

      gsapTimelineRef.current = tl;

      const props = getDirectionProps(direction, "exit");
      tl.to(containerRef.current, {
        ...props,
        duration: 0.5,
        ease: "power2.inOut",
      });
    }
  };

  // 设置到相反方向（无动画）
  const setPositionToOpposite = (direction: string) => {
    if (!containerRef.current) return;

    const props = getDirectionProps(direction, "opposite");
    gsap.set(containerRef.current, props);
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
        ease: "power2.inOut",
        onComplete: () => {
          setTransitionState("idle");
        },
      });
    } else {
      // 位移动画：500ms内移动到中央
      gsap.to(containerRef.current, {
        x: 0,
        y: 0,
        opacity: 1,
        duration: 0.5,
        ease: "power2.inOut",
        onComplete: () => {
          setTransitionState("idle");
        },
      });
    }
  }, [transitionDirection]);

  // 监听 pathname 变化
  useEffect(() => {
    if (
      transitionState === "waiting" &&
      pathname !== previousPathname.current
    ) {
      // pathname 变化，更新内容并开始进入动画
      setCurrentChildren(children);
      startEnterAnimation();
    }
  }, [pathname, transitionState, children, startEnterAnimation]);

  // 获取方向属性
  const getDirectionProps = (direction: string, type: "exit" | "opposite") => {
    const props: gsap.TweenVars = { opacity: type === "exit" ? 0 : 1 };

    switch (direction) {
      case "left":
        // left方向：新页面从左边进入，所以当前页面向右退出
        if (type === "exit") {
          props.x = "100%"; // 当前页面向右移动
        } else {
          props.x = "-100%"; // 新页面从左边开始位置
        }
        break;
      case "right":
        // right方向：新页面从右边进入，所以当前页面向左退出
        if (type === "exit") {
          props.x = "-100%"; // 当前页面向左移动
        } else {
          props.x = "100%"; // 新页面从右边开始位置
        }
        break;
      case "up":
        // up方向：新页面从上边进入，所以当前页面向下退出
        if (type === "exit") {
          props.y = "100%"; // 当前页面向下移动
        } else {
          props.y = "-100%"; // 新页面从上边开始位置
        }
        break;
      case "down":
        // down方向：新页面从下边进入，所以当前页面向上退出
        if (type === "exit") {
          props.y = "-100%"; // 当前页面向上移动
        } else {
          props.y = "100%"; // 新页面从下边开始位置
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

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative opacity-100"
      // GSAP 会通过 JavaScript 设置 transform 和 opacity
      // 初始状态由 CSS 类提供
    >
      {currentChildren}
    </div>
  );
}
