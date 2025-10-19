"use client";

import { motion } from "framer-motion";

interface LoadingIndicatorProps {
  /**
   * 指示器尺寸
   * @default "md"
   */
  size?: "sm" | "md" | "lg";
  /**
   * 自定义类名
   */
  className?: string;
}

export function LoadingIndicator({
  size = "md",
  className = "",
}: LoadingIndicatorProps) {
  // 尺寸配置
  const sizeConfig = {
    sm: {
      width: "w-1",
      minHeight: "h-2",
      maxHeight: "h-4",
      gap: "gap-0.5",
    },
    md: {
      width: "w-1.5",
      minHeight: "h-3",
      maxHeight: "h-6",
      gap: "gap-1",
    },
    lg: {
      width: "w-2",
      minHeight: "h-4",
      maxHeight: "h-8",
      gap: "gap-1.5",
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={`flex h-full items-center justify-center ${className}`}>
      <div className={`flex items-end ${config.gap}`}>
        {[0, 1, 2, 3, 4].map((index) => {
          // 每个柱子完全独立的动画时序
          // 使用不同的持续时间和起始延迟，创造随机但和谐的效果
          const durations = [1.0, 1.15, 0.95, 1.1, 1.05]; // 每个柱子不同的动画周期
          const delays = [0, 0.2, 0.4, 0.1, 0.3]; // 不规则的起始延迟
          const minScales = [0.3, 0.35, 0.4, 0.32, 0.38]; // 不同的最小高度
          const maxScales = [0.95, 1.0, 0.9, 0.92, 0.98]; // 不同的最大高度

          return (
            <motion.div
              key={index}
              className={`${config.width} ${config.maxHeight} bg-current text-muted`}
              style={{ originY: 1 }}
              animate={{
                scaleY: [
                  minScales[index] ?? 0.3,
                  maxScales[index] ?? 0.95,
                  minScales[index] ?? 0.3,
                ],
              }}
              transition={{
                duration: durations[index] ?? 1.0,
                delay: delays[index] ?? 0,
                repeat: Infinity,
                ease: "easeInOut", // 平滑的缓动效果
                times: [0, 0.5, 1],
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
