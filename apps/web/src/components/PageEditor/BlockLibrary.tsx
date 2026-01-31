import React from "react";
import { RiAddLine, RiLoader4Line } from "@remixicon/react";

const AVAILABLE_BLOCKS = [
  { type: "default", label: "Default Block" },
  { type: "hero", label: "Hero Gallery" },
  { type: "projects", label: "Projects Showcase" },
  { type: "posts", label: "Recent Posts" },
  { type: "tags-categories", label: "Tags & Categories" },
];

export default function BlockLibrary({
  onAdd,
  isLoading,
}: {
  onAdd: (type: string) => Promise<void>;
  isLoading?: boolean;
}) {
  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-3 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20">
        Block Library
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {AVAILABLE_BLOCKS.map((block) => (
          <button
            key={block.type}
            onClick={() => onAdd(block.type)}
            disabled={isLoading}
            className="w-full flex items-center justify-between p-2 rounded border hover:border-primary hover:bg-muted/50 transition-colors text-sm group text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div>
              <div className="font-medium text-foreground">{block.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {block.type}
              </div>
            </div>
            {isLoading ? (
              <RiLoader4Line
                size={16}
                className="text-muted-foreground animate-spin"
              />
            ) : (
              <RiAddLine
                size={16}
                className="text-muted-foreground group-hover:text-primary"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
