import React from "react";
import dynamic from "next/dynamic";

import type {
  BlockComponentMap,
  BlockConfig,
  BlockType,
} from "@/blocks/core/types";
import SortableBlockWrapper from "@/components/server/features/page-editor/SortableBlockWrapper";

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
      <Component config={block as never} />
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
