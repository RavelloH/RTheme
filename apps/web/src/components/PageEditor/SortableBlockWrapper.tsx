import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";

interface SortableBlockWrapperProps {
  id: string | number;
  children: React.ReactNode;
  isActive?: boolean;
  onSelect?: () => void;
  hideAnimation?: boolean; // 是否隐藏斜线动画，只保留背景色
}

export default function SortableBlockWrapper({
  id,
  children,
  isActive,
  onSelect,
  hideAnimation = false,
}: SortableBlockWrapperProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} {...attributes} className="h-full">
      <div
        style={style}
        {...listeners}
        onClick={() => onSelect?.()}
        data-draggable-id={id}
        className={`h-full relative group cursor-grab active:cursor-grabbing transition-all border-2 overflow-hidden [&_a]:pointer-events-none [&_button]:pointer-events-none ${
          isActive
            ? "border-primary z-10 shadow-lg"
            : isDragging
              ? "border-dashed border-primary/50 bg-primary/20"
              : "border-transparent hover:border-primary/50"
        } ${isDragging ? "z-0" : ""}`}
      >
        {/* Editing State Highlight (Striped Animation) */}
        <AnimatePresence>
          {isActive && !isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 z-[50] pointer-events-none overflow-hidden"
            >
              {/* 背景色 - 始终保留 */}
              <div className="absolute inset-0 bg-primary/5 mix-blend-multiply" />

              {/* 斜线动画 - 当 hideAnimation 为 true 时隐藏 */}
              <AnimatePresence>
                {!hideAnimation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 text-primary/20"
                  >
                    <motion.div
                      className="absolute inset-[-100%] w-[300%] h-[300%]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(45deg, currentColor 0, currentColor 10px, transparent 10px, transparent 20px)",
                        backgroundSize: "28.28px 28.28px",
                      }}
                      animate={{ x: [0, 28.28] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        {children}
      </div>
    </div>
  );
}
