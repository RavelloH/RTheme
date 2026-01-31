import React from "react";
import dynamic from "next/dynamic";
import type { BlockConfig, BlockComponentMap, BlockType } from "@/blocks/types";

// 类型安全的组件映射：使用动态导入，并为每个组件添加类型断言
const BLOCK_COMPONENTS: BlockComponentMap = {
  default: dynamic(
    () => import("@/blocks/Default"),
  ) as BlockComponentMap["default"],
  hero: dynamic(
    () => import("@/blocks/HeroGallery"),
  ) as BlockComponentMap["hero"],
  projects: dynamic(
    () => import("@/blocks/RecentProjects"),
  ) as BlockComponentMap["projects"],
  posts: dynamic(
    () => import("@/blocks/RecentPosts"),
  ) as BlockComponentMap["posts"],
  "tags-categories": dynamic(
    () => import("@/blocks/TagsCategories"),
  ) as BlockComponentMap["tags-categories"],
};

// 获取组件的类型安全辅助函数
function getBlockComponent(type: BlockType) {
  return BLOCK_COMPONENTS[type];
}

interface BlockRendererProps {
  config?: BlockConfig[]; // 允许 undefined，但在函数参数中给默认值
  data?: Record<string, unknown>;
}

export default function BlockRenderer({
  config = [],
  data = {},
}: BlockRendererProps) {
  // 如果没有块，直接返回 null
  if (!config.length) return null;

  return (
    <>
      {config.map((block, index) => {
        const blockType = (block.block || "default") as BlockType;
        const Component = getBlockComponent(blockType);

        if (!Component) {
          // 仅在开发环境警告，避免生产环境控制台刷屏
          if (process.env.NODE_ENV === "development") {
            console.warn(`[BlockRenderer] Unknown block: ${block.block}`);
          }
          return null;
        }

        return (
          <Component
            key={block.id ?? index}
            config={block as never} // 类型断言：因为 Component 的类型与 block 匹配
            data={data}
          />
        );
      })}
    </>
  );
}
