import React from "react";
import dynamic from "next/dynamic";

import type {
  BlockComponentMap,
  BlockConfig,
  BlockType,
} from "@/blocks/core/types";
import SortableBlockWrapper from "@/components/server/features/page-editor/SortableBlockWrapper";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

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

export function SingleBlockRenderer({ block }: { block: BlockConfig }) {
  const blockType = (block.block || "default") as BlockType;
  const Component = getBlockComponent(blockType);

  if (!Component) return null;

  return (
    <div className="h-full">
      <React.Suspense fallback={<LoadingIndicator className="px-20" />}>
        <Component config={block as never} />
      </React.Suspense>
    </div>
  );
}

interface VisualBlockRendererProps {
  blocks: BlockConfig[];
  activeBlockId: string | number | null;
  onSelectBlock: (id: string | number) => void;
  hideAnimationBlockIds: Set<string | number>;
  scale?: number;
}

export default function VisualBlockRenderer({
  blocks,
  activeBlockId,
  onSelectBlock,
  hideAnimationBlockIds,
  scale = 1,
}: VisualBlockRendererProps) {
  return (
    <>
      {blocks.map((block) => {
        return (
          <SortableBlockWrapper
            key={block.id}
            id={block.id}
            isActive={block.id === activeBlockId}
            onSelect={() => onSelectBlock(block.id)}
            hideAnimation={hideAnimationBlockIds.has(block.id)}
            scale={scale}
          >
            <SingleBlockRenderer block={block} />
          </SortableBlockWrapper>
        );
      })}
    </>
  );
}
