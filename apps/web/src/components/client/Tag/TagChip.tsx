"use client";

import React from "react";
import { motion } from "framer-motion";
import { RiCloseLine } from "@remixicon/react";

export interface TagChipProps {
  name: string;
  slug: string;
  isNew?: boolean; // 是否为待创建的新标签
  onRemove: () => void;
  className?: string;
}

export function TagChip({
  name,
  isNew = false,
  onRemove,
  className = "",
}: TagChipProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.2 }}
      className={`
        inline-flex items-center gap-1.5
        px-3 py-1.5
        bg-primary/20 text-primary
        border border-primary/30
        rounded-sm
        text-sm
        ${className}
      `}
    >
      <span className="font-medium">#{name}</span>
      {isNew && <span className="text-xs opacity-70">(待创建)</span>}
      <motion.button
        type="button"
        onClick={onRemove}
        className="
          ml-0.5 -mr-1
          p-0.5
          rounded-full
          hover:bg-primary/30
          transition-colors
          focus:outline-none
          focus:ring-2
          focus:ring-primary
        "
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        aria-label={`移除标签 ${name}`}
      >
        <RiCloseLine size={"1em"} />
      </motion.button>
    </motion.div>
  );
}
