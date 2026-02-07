import React from "react";
import dynamic from "next/dynamic";

import { loadBlockComponent } from "@/blocks/core/catalog";
import type {
  BlockComponentProps,
  ResolvedBlock,
} from "@/blocks/core/definition";
import SortableBlockWrapper from "@/components/server/features/page-editor/SortableBlockWrapper";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

const componentCache = new Map<
  string,
  React.ComponentType<BlockComponentProps>
>();

function EmptyBlock() {
  return null;
}

function getBlockComponent(
  type: string,
): React.ComponentType<BlockComponentProps> {
  if (componentCache.has(type)) {
    return componentCache.get(type)!;
  }

  const Component = dynamic(async () => {
    const loaded = await loadBlockComponent(type);
    return loaded || EmptyBlock;
  }) as React.ComponentType<BlockComponentProps>;

  componentCache.set(type, Component);
  return Component;
}

export function SingleBlockRenderer({ block }: { block: ResolvedBlock }) {
  const blockType = block.block || "default";
  const Component = getBlockComponent(blockType);

  if (!Component) return null;

  return (
    <div className="h-full">
      <React.Suspense fallback={<LoadingIndicator className="px-20" />}>
        <Component block={block} mode="editor" />
      </React.Suspense>
    </div>
  );
}

interface VisualBlockRendererProps {
  blocks: ResolvedBlock[];
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
