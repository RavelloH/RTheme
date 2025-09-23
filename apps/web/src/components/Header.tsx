"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import Menu from "./Menu";
import { useMenuStore } from "@/store/menuStore";
import { useBroadcast } from "@/hooks/useBroadcast";
import type { MenuItem } from "@/lib/server/menuCache";

interface TransitionMessage {
  type: "page-transition";
  direction: "left" | "right" | "up" | "down" | "unknown";
}

// 加载指示器组件
function LoadingIndicator() {
  return (
    <div className="flex space-x-1">
      {Array.from({ length: 10 }, (_, i) => (
        <motion.span
          key={i}
          className="text-foreground"
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.08,
            ease: "easeInOut",
          }}
        >
          /
        </motion.span>
      ))}
    </div>
  );
}

interface TitleTransitionProps {
  children: React.ReactNode;
  direction: "left" | "right" | "up" | "down" | "unknown";
  isVisible: boolean;
}

function TitleTransition({
  children,
  direction,
  isVisible,
}: TitleTransitionProps) {
  const getAnimationProps = () => {
    // 映射左右方向到上下方向
    const mappedDirection =
      direction === "left" ? "up" : direction === "right" ? "down" : direction;

    switch (mappedDirection) {
      case "up":
        // 向上方向：从下向上移动，退出时也向上消失
        return {
          initial: { y: 20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -20, opacity: 0 },
        };
      case "down":
        // 向下方向：从上向下移动，退出时也向下消失
        return {
          initial: { y: -20, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: 20, opacity: 0 },
        };
      case "unknown":
      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
        };
    }
  };

  const { initial, animate, exit } = getAnimationProps();

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={initial}
          animate={animate}
          exit={exit}
          transition={{
            duration: 0.3,
            ease: "easeInOut",
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Header({ menus }: { menus: MenuItem[] }) {
  const { isMenuOpen, toggleMenu } = useMenuStore();
  const headerRef = useRef<HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef<string>("");
  const [displayTitle, setDisplayTitle] = useState("NeutralPress");
  const [showTitle, setShowTitle] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<
    "left" | "right" | "up" | "down" | "unknown"
  >("unknown");
  const [transitionState, setTransitionState] = useState<
    "idle" | "exiting" | "entering"
  >("idle");

  // 监听广播消息
  useBroadcast((message: TransitionMessage) => {
    if (message?.type === "page-transition") {
      const { direction } = message;
      setTransitionDirection(direction);
      startTransition();
    }
  });

  // 开始过渡动画
  const startTransition = () => {
    if (transitionState !== "idle") return;

    setTransitionState("exiting");
    setShowTitle(false);

    setTimeout(() => {
      setShowLoading(true);
    }, 200);
  };

  // 监听 pathname 变化（页面加载完成）
  useEffect(() => {
    if (pathname === previousPathname.current) return;

    if (transitionState === "exiting" && showLoading) {
      // 页面已经加载完成，切换到新title
      updateTitle();
      setShowLoading(false);
      setTransitionState("entering");
      setShowTitle(true);

      setTimeout(() => {
        setTransitionState("idle");
      }, 100);
    }

    previousPathname.current = pathname;
  }, [pathname, transitionState, showLoading]);

  // 更新标题
  const updateTitle = () => {
    if (typeof document === "undefined") return;

    const titleElement = document.querySelector("title");
    if (!titleElement) return;

    const documentTitle = titleElement.textContent || "";
    const cleanTitle = documentTitle.includes(" | ")
      ? documentTitle.split(" | ")[0] || "NeutralPress"
      : documentTitle || "NeutralPress";

    setDisplayTitle(cleanTitle);
  };

  // 监听加载完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoaded(true);

      // 使用GSAP动画从上方滑入
      if (headerRef.current) {
        gsap.fromTo(
          headerRef.current,
          { y: -78 },
          {
            y: 0,
            duration: 0.8,
            ease: "power2.out",
          },
        );
      }
    };

    window.addEventListener("loadingComplete", handleLoadingComplete);

    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
    };
  }, []);

  // 初始化标题
  useEffect(() => {
    updateTitle();
  }, []);

  return (
    <>
      <motion.header
        ref={headerRef}
        className="w-full h-[78px] text-foreground bg-background border-y border-border flex relative z-50"
        initial={{ y: -78 }}
        animate={{
          y: isMenuOpen ? `calc(100vh - 78px)` : isLoaded ? 0 : -78,
        }}
        transition={{
          type: "spring",
          damping: 35,
          stiffness: 280,
          mass: 1,
          restDelta: 0.01,
          restSpeed: 0.01,
        }}
      >
        <div className="w-[78px] flex items-center">
          <Image src="/avatar.jpg" alt="Logo" width={78} height={78} />
        </div>
        <div className="flex-1 flex items-center justify-center relative h-full">
          <TitleTransition
            direction={transitionDirection}
            isVisible={showTitle}
          >
            <span>{displayTitle}</span>
          </TitleTransition>
          <TitleTransition
            direction={transitionDirection}
            isVisible={showLoading}
          >
            <LoadingIndicator />
          </TitleTransition>
        </div>
        <div className="w-[78px] h-full border-l border-border flex items-center justify-center">
          <MenuButton isOpen={isMenuOpen} onClick={toggleMenu} />
        </div>
      </motion.header>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed inset-0 bg-background z-40"
            initial={{ y: `calc(-100% + 78px)` }}
            animate={{ y: 0 }}
            exit={{ y: `calc(-100% + 78px)` }}
            transition={{
              type: "spring",
              damping: 35,
              stiffness: 280,
              mass: 1,
              restDelta: 0.01,
              restSpeed: 0.01,
            }}
          >
            <div className="h-full pb-[78px]">
              <Menu
                setIsMenuOpen={(isOpen: boolean) =>
                  useMenuStore.getState().setMenuOpen(isOpen)
                }
                menus={menus}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MenuButton({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="flex flex-col justify-center items-center w-full h-full relative group"
      aria-label="菜单"
      onClick={onClick}
    >
      <motion.div
        className="relative w-8 h-8 flex flex-col justify-center items-center"
        animate={{ rotate: isOpen ? 180 : 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          duration: 0.5,
          ease: "easeInOut",
          scale: { duration: 0.2 },
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          className="absolute transition-colors duration-200 group-hover:text-white group-hover:cursor-pointer"
          fill="none"
        >
          <motion.path
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M4 6h16"
            style={{ transformOrigin: "4px 6px" }}
            animate={{
              rotate: isOpen ? 45 : 0,
              y: isOpen ? 6 : 0,
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              delay: isOpen ? 0.2 : 0.2,
            }}
          />
          <motion.path
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M4 12h16"
            animate={{
              opacity: isOpen ? 0 : 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1],
              delay: isOpen ? 0 : 0.2,
            }}
          />
          <motion.path
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            d="M4 18h16"
            style={{ transformOrigin: "4px 18px" }}
            animate={{
              rotate: isOpen ? -45 : 0,
              y: isOpen ? -6 : 0,
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
              delay: isOpen ? 0.2 : 0.2,
            }}
          />
        </svg>
      </motion.div>
    </button>
  );
}
