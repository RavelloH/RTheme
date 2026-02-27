import React from "react";
import dynamic from "next/dynamic";

import { loadBlockComponent } from "@/blocks/core/catalog";
import type {
  BlockComponentProps,
  ResolvedBlock,
} from "@/blocks/core/definition";
import HorizontalScrollAnimationWrapper, {
  type HorizontalScrollAnimationFeatureProps,
} from "@/components/client/layout/AnimationWrapper";

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
  horizontalAnimation?: HorizontalScrollAnimationFeatureProps;
}

export default function BlockRenderer({
  blocks = [],
  horizontalAnimation,
}: BlockRendererProps) {
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

        const key = block.id ?? index;

        if (!horizontalAnimation) {
          return <Component key={key} block={block} mode="page" />;
        }

        const renderedBlock = <Component block={block} mode="page" />;

        return (
          <HorizontalScrollAnimationWrapper
            key={key}
            enableParallax={horizontalAnimation.enableParallax}
            enableFadeElements={horizontalAnimation.enableFadeElements}
            enableLineReveal={horizontalAnimation.enableLineReveal}
          >
            {renderedBlock}
          </HorizontalScrollAnimationWrapper>
        );
      })}
    </>
  );
}
