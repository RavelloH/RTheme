import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { RiDeleteBinLine, RiDraggable } from "@remixicon/react";

import type { BlockConfig } from "@/blocks/types";

interface SortableBlockItemProps {
  block: BlockConfig;
  isSelected?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  isOverlay?: boolean;
}

export default function SortableBlockItem({
  block,
  isSelected,
  onSelect,
  onDelete,
  isOverlay,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-3 p-3 rounded-lg border bg-card transition-all ${
        isSelected
          ? "ring-2 ring-primary border-primary"
          : "border-border hover:border-primary/50"
      } ${isDragging ? "opacity-50" : "opacity-100"} ${
        isOverlay
          ? "shadow-xl ring-2 ring-primary scale-105 cursor-grabbing"
          : ""
      }`}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="text-muted-foreground cursor-grab active:cursor-grabbing hover:text-foreground p-1"
      >
        <RiDraggable size={20} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {block.block?.toUpperCase() || "DEFAULT"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {block.description || `ID: ${block.id}`}
        </div>
      </div>

      {/* Actions */}
      {!isOverlay && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            title="删除区块"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
          >
            <RiDeleteBinLine size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
