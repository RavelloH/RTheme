import React from "react";
import dynamic from "next/dynamic";

import type {
  BlockComponentMap,
  BlockConfig,
  BlockType,
} from "@/blocks/core/types";

// 类型安全的组件映射：使用动态导入，并为每个组件添加类型断言
const BLOCK_COMPONENTS: BlockComponentMap = {
  default: dynamic(
    () => import("@/blocks/collection/Default"),
  ) as BlockComponentMap["default"],
  hero: dynamic(
    () => import("@/blocks/collection/HeroGallery"),
  ) as BlockComponentMap["hero"],
  projects: dynamic(
    () => import("@/blocks/collection/RecentProjects"),
  ) as BlockComponentMap["projects"],
  posts: dynamic(
    () => import("@/blocks/collection/RecentPosts"),
  ) as BlockComponentMap["posts"],
  "tags-categories": dynamic(
    () => import("@/blocks/collection/TagsCategories"),
  ) as BlockComponentMap["tags-categories"],
  accordion: dynamic(
    () => import("@/blocks/collection/Accordion"),
  ) as BlockComponentMap["accordion"],
  "paged-posts": dynamic(
    () => import("@/blocks/collection/PagedPosts"),
  ) as BlockComponentMap["paged-posts"],
  pagination: dynamic(
    () => import("@/blocks/collection/Pagination"),
  ) as BlockComponentMap["pagination"],
  quote: dynamic(
    () => import("@/blocks/collection/Quote"),
  ) as BlockComponentMap["quote"],
  divider: dynamic(
    () => import("@/blocks/collection/Divider"),
  ) as BlockComponentMap["divider"],
  cards: dynamic(
    () => import("@/blocks/collection/Cards"),
  ) as BlockComponentMap["cards"],
  cta: dynamic(
    () => import("@/blocks/collection/CallToAction"),
  ) as BlockComponentMap["cta"],
  author: dynamic(
    () => import("@/blocks/collection/Author"),
  ) as BlockComponentMap["author"],
  "social-links": dynamic(
    () => import("@/blocks/collection/SocialLinks"),
  ) as BlockComponentMap["social-links"],
  testimonial: dynamic(
    () => import("@/blocks/collection/Testimonials"),
  ) as BlockComponentMap["testimonial"],
  tabs: dynamic(
    () => import("@/blocks/collection/Tabs"),
  ) as BlockComponentMap["tabs"],
  gallery: dynamic(
    () => import("@/blocks/collection/Gallery"),
  ) as BlockComponentMap["gallery"],
  "multi-row-layout": dynamic(
    () => import("@/blocks/collection/MultiRowLayout"),
  ) as BlockComponentMap["multi-row-layout"],
  "timeline-item": dynamic(
    () => import("@/blocks/collection/Timeline"),
  ) as BlockComponentMap["timeline-item"],
  "archive-calendar": dynamic(
    () => import("@/blocks/collection/ArchiveCalendar"),
  ) as BlockComponentMap["archive-calendar"],
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
