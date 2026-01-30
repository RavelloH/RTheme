"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import type { BlockConfig, BlockProps } from "@/blocks/types";

// 保持动态导入映射不变
const BLOCK_COMPONENTS: Record<string, React.ComponentType<BlockProps>> = {
  default: dynamic(() => import("@/blocks/Default")),
  hero: dynamic(() => import("@/blocks/Hero")),
  projects: dynamic(() => import("@/blocks/Projects")),
  posts: dynamic(() => import("@/blocks/Posts")),
  "tags-categories": dynamic(() => import("@/blocks/TagsCategories")),
};

interface BlockRendererProps {
  config?: BlockConfig[]; // 允许 undefined，但在函数参数中给默认值
  data?: Record<string, unknown>;
  enabledBlocks?: (string | number)[];
}

export default function BlockRenderer({
  config = [], // 1. 默认值简化 null 检查
  data = {},
  enabledBlocks,
}: BlockRendererProps) {
  // 2. 使用 useMemo 缓存过滤结果
  const activeBlocks = useMemo(() => {
    if (!config.length) return [];
    const allowList = enabledBlocks?.length
      ? new Set(enabledBlocks.map(String))
      : null;
    return config.filter((block) => {
      if (!block.enabled) return false;
      // 如果存在白名单，必须在白名单内；否则直接通过
      return allowList ? allowList.has(String(block.id)) : true;
    });
  }, [config, enabledBlocks]);
  // 如果没有激活的块，直接返回 null
  if (!activeBlocks.length) return null;

  return (
    <>
      {activeBlocks.map((block, index) => {
        // 4. 获取组件，若未定义则回退到 null (或者 default)
        const Component = BLOCK_COMPONENTS[block.block || "default"];
        if (!Component) {
          // 仅在开发环境警告，避免生产环境控制台刷屏
          if (process.env.NODE_ENV === "development") {
            console.warn(`[BlockRenderer] Unknown block: ${block.block}`);
          }
          return null;
        }
        return (
          <Component
            // 5. Key 优化：优先使用唯一 ID，索引作为最后的兜底
            key={block.id ?? index}
            config={block}
            data={data}
          />
        );
      })}
    </>
  );
}
