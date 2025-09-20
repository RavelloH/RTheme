"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { useMenuStore } from "@/store/menuStore";
import Image from "next/image";
import { Panel } from "./Panel";

export default function Footer() {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const isMenuOpen = useMenuStore((state) => state.isMenuOpen);
  const footerRef = useRef<HTMLElement>(null);

  const svgContainerRef = useRef<HTMLDivElement>(null);

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

  // 鼠标跟随旋转效果
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    let currentRotation = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // 计算相对于中心的向量
      const deltaX = mouseX - centerX;
      const deltaY = mouseY - centerY;

      // 计算角度（从12点钟方向顺时针为正方向）
      let targetAngle = Math.atan2(deltaX, -deltaY) * (180 / Math.PI);

      // 确保角度在0-360度范围内
      if (targetAngle < 0) targetAngle += 360;

      // 计算最短旋转路径
      let rotationDiff = targetAngle - currentRotation;

      // 处理跨过0度线的情况
      if (rotationDiff > 180) {
        rotationDiff -= 360;
      } else if (rotationDiff < -180) {
        rotationDiff += 360;
      }

      currentRotation += rotationDiff;

      // 使用GSAP平滑旋转
      gsap.to(container, {
        rotation: currentRotation,
        duration: 0.3,
        ease: "power2.out"
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
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

  const toggleControlCenter = () => {
    setIsConsoleOpen(!isConsoleOpen);
  };

  function ControlCenterIcon({
    isConsoleOpen,
    className,
  }: {
    isConsoleOpen: boolean;
    className?: string;
  }) {
    const circumference = 2 * Math.PI * 9;

    return (
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* 外围圆圈 */}
        <motion.circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: isConsoleOpen ? 0 : circumference }}
          animate={{
            strokeDashoffset: isConsoleOpen ? circumference : 0,
          }}
          transition={{
            duration: 0.8,
            ease: [0.4, 0, 0.2, 1],
          }}
          style={{
            transformOrigin: "center",
            rotate: 90,
          }}
        />
        <path
          d="M12 6 L10 12 L14 12 Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M12 18 L10 12 L14 12 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

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
        <div className="w-[78px] h-full border-l border-border flex items-center justify-center">
          <div id="svg-container" ref={svgContainerRef}>
            <button
              className="flex flex-col justify-center items-center w-full h-full relative group"
              aria-label="控制中心"
              onClick={toggleControlCenter}
            >
              <motion.div
                className="relative w-6 h-6 flex flex-col justify-center items-center"
                animate={{ rotate: isConsoleOpen ? -180 : 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                transition={{
                  duration: 0.5,
                  ease: "easeInOut",
                  scale: { duration: 0.2 },
                }}
              >
                <ControlCenterIcon
                  isConsoleOpen={isConsoleOpen}
                  className="absolute transition-colors duration-200 group-hover:text-white group-hover:cursor-pointer"
                />
              </motion.div>
            </button>
          </div>
        </div>
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
            <Panel onClose={() => setIsConsoleOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
