import React from "react";
import dynamic from "next/dynamic";

import { loadBlockComponent } from "@/blocks/core/catalog";
import type {
  BlockComponentProps,
  ResolvedBlock,
} from "@/blocks/core/definition";

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

interface BlockRendererProps {
  blocks?: ResolvedBlock[];
}

export default function BlockRenderer({ blocks = [] }: BlockRendererProps) {
  if (!blocks.length) return null;

  return (
    <>
      {blocks.map((block, index) => {
        const type = block.block || "default";
        const Component = getBlockComponent(type);

        if (!Component) {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[BlockRenderer] Unknown block: ${block.block}`);
          }
          return null;
        }

        return <Component key={block.id ?? index} block={block} mode="page" />;
      })}
    </>
  );
}
