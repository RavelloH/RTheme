import React from "react";
import { RiLoader4Line } from "@remixicon/react";

import type { BlockConfig } from "@/blocks/types";
import BlockRenderer from "@/components/BlockRenderer";
import HorizontalScroll from "@/components/HorizontalScroll";

interface PreviewStageProps {
  blocks: BlockConfig[];
}

export default function PreviewStage({ blocks }: PreviewStageProps) {
  // 简单的错误边界 fallback
  if (!blocks) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        <RiLoader4Line className="animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background overflow-hidden relative shadow-sm">
      <div className="absolute inset-0 z-0">
        <HorizontalScroll className="h-full">
          <BlockRenderer config={blocks} />
        </HorizontalScroll>
      </div>

      {blocks.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">画布为空</p>
            <p className="text-sm">请从左侧添加区块</p>
          </div>
        </div>
      )}
    </div>
  );
}
