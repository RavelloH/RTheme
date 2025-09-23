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
      // pathname 变化，更新内容并开始进入动画
      setCurrentChildren(children);
      startEnterAnimation();
    }
  }, [pathname, transitionState, children, startEnterAnimation]);

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
