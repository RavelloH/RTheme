"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useMenuStore } from "@/store/menuStore";
import { useConsoleStore } from "@/store/consoleStore";
import Image from "next/image";
import { Panel } from "./Panel";
import { ConsoleButton } from "./ConsoleButton";

export default function Footer() {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const isMenuOpen = useMenuStore((state) => state.isMenuOpen);
  const { isConsoleOpen, toggleConsole } = useConsoleStore();
  const footerRef = useRef<HTMLElement>(null);

  // 监听加载完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsLoaded(true);

      // 使用GSAP动画从下方滑入
      if (footerRef.current) {
        gsap.fromTo(
          footerRef.current,
          { y: 78 },
          {
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            delay: 0.2, // 稍微延迟，让Header先动画
          }
        );
      }
    };

    window.addEventListener("loadingComplete", handleLoadingComplete);

    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
    };
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      // 延迟开始Footer动画，等待Header下降到合适位置
      const delay = 200; // 根据Header动画时长调整
      setTimeout(() => {
        setShouldAnimate(true);
      }, delay);
    } else {
      // 菜单关闭时立即重置
      setShouldAnimate(false);
    }
  }, [isMenuOpen]);

  
  return (
    <>
      <motion.footer
        ref={footerRef}
        className="w-full h-[78px] text-foreground bg-background border-y border-border flex relative z-50"
        initial={{ y: 78 }}
        animate={{
          y: shouldAnimate
            ? 78
            : isConsoleOpen
              ? `calc(-60vh + 78px)`
              : isLoaded
                ? 0
                : 78,
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
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-muted-foreground">
            © 2024 NeutralPress. All rights reserved.
          </span>
        </div>
        {/* 控制面板按钮独立于Footer动画，避免状态重置 */}
        <ConsoleButton />
      </motion.footer>

      <AnimatePresence>
        {isConsoleOpen && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-40"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 35,
              stiffness: 280,
              mass: 1,
              restDelta: 0.01,
              restSpeed: 0.01,
            }}
          >
            <Panel onClose={() => useConsoleStore.getState().setConsoleOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
