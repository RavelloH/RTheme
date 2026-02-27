import React from "react";

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
  Promise<React.ComponentType<BlockComponentProps>>
>();

function EmptyBlock() {
  return null;
}

async function getBlockComponent(
  type: string,
): Promise<React.ComponentType<BlockComponentProps>> {
  if (componentCache.has(type)) {
    return componentCache.get(type)!;
  }

  const componentPromise = loadBlockComponent(type)
    .then((loaded) => loaded || EmptyBlock)
    .catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn(`[BlockRenderer] Failed to load block: ${type}`, error);
      }
      return EmptyBlock;
    });

  componentCache.set(type, componentPromise);
  return componentPromise;
}

interface BlockRendererProps {
  blocks?: ResolvedBlock[];
  horizontalAnimation?: HorizontalScrollAnimationFeatureProps;
}

export default async function BlockRenderer({
  blocks = [],
  horizontalAnimation,
}: BlockRendererProps) {
  if (!blocks.length) return null;

  const blockEntries = await Promise.all(
    blocks.map(async (block, index) => {
      const type = block.block || "default";
      const Component = await getBlockComponent(type);
      return {
        block,
        index,
        Component,
      };
    }),
  );

  return (
    <>
      {blockEntries.map(({ block, index, Component }) => {
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
