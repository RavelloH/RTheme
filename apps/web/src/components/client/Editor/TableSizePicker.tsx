"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TableSizePickerProps {
  onSelect: (rows: number, cols: number) => void;
  trigger: React.ReactNode;
}

export function TableSizePicker({ onSelect, trigger }: TableSizePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredCell, setHoveredCell] = useState({ row: 0, col: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const maxRows = 9;
  const maxCols = 9;

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleCellClick = () => {
    if (hoveredCell.row > 0 && hoveredCell.col > 0) {
      onSelect(hoveredCell.row, hoveredCell.col);
      setIsOpen(false);
      setHoveredCell({ row: 0, col: 0 });
    }
  };

  const isCellHighlighted = (row: number, col: number) => {
    return row <= hoveredCell.row && col <= hoveredCell.col;
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 触发器 */}
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>

      {/* 下拉面板 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 bg-background/95 backdrop-blur-sm border border-foreground/10 rounded-lg shadow-lg p-3"
          >
            {/* 标题 */}
            <div className="text-xs text-foreground/60 mb-2 text-center">
              {hoveredCell.row > 0 && hoveredCell.col > 0
                ? `${hoveredCell.row} × ${hoveredCell.col} 表格`
                : "选择表格大小"}
            </div>

            {/* 网格 */}
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${maxCols}, 20px)`,
                gridTemplateRows: `repeat(${maxRows}, 20px)`,
              }}
            >
              {Array.from({ length: maxRows * maxCols }).map((_, index) => {
                const row = Math.floor(index / maxCols) + 1;
                const col = (index % maxCols) + 1;
                const isHighlighted = isCellHighlighted(row, col);

                return (
                  <div
                    key={index}
                    className={`
                      border border-foreground/20 rounded-sm cursor-pointer
                      transition-colors duration-75
                      ${isHighlighted ? "bg-primary/60 border-primary" : "bg-background hover:bg-foreground/10"}
                    `}
                    onMouseEnter={() => setHoveredCell({ row, col })}
                    onClick={handleCellClick}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
