"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";

import { useMobile } from "@/hooks/use-mobile";
import { useConsoleStore } from "@/store/console-store";

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
      width="2em"
      height="2em"
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

export function ConsoleButton() {
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [currentRotation, setCurrentRotation] = useState(0);
  const { isConsoleOpen, toggleConsole } = useConsoleStore();
  const isMobile = useMobile();

  // 根据设备类型获取高度值
  const getButtonWidth = () => (isMobile ? "6em" : "5em");

  // 鼠标跟随旋转效果
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

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

      // 计算角度差，处理跨过0度边界的情况
      let angleDiff = targetAngle - currentRotation;

      // 将角度差标准化到[-180, 180]范围内
      while (angleDiff > 180) angleDiff -= 360;
      while (angleDiff < -180) angleDiff += 360;

      const newRotation = currentRotation + angleDiff;
      setCurrentRotation(newRotation);

      // 使用GSAP平滑旋转
      gsap.to(container, {
        rotation: newRotation,
        duration: 0.3,
        ease: "power2.out",
      });
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [currentRotation]);

  return (
    <div
      className="h-full border-l border-border flex items-center justify-center"
      style={{ width: getButtonWidth() }}
    >
      <div id="svg-container" ref={svgContainerRef}>
        <button
          className="flex flex-col justify-center items-center w-full h-full relative group"
          aria-label="控制中心"
          onClick={toggleConsole}
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
  );
}
