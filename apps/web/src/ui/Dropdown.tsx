"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiArrowDownSLine } from "@remixicon/react";

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right" | "center";
  triggerClassName?: string;
}

export function Dropdown({
  trigger,
  options,
  className = "",
  disabled = false,
  size = "sm",
  align = "left",
  triggerClassName = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉框
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

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          item: "px-3 py-1.5 text-sm",
          minWidth: "min-w-[120px]",
        };
      case "md":
        return {
          item: "px-4 py-2 text-base",
          minWidth: "min-w-[160px]",
        };
      case "lg":
        return {
          item: "px-5 py-2.5 text-lg",
          minWidth: "min-w-[200px]",
        };
      default:
        return {
          item: "px-3 py-1.5 text-sm",
          minWidth: "min-w-[120px]",
        };
    }
  };

  const getAlignmentStyles = () => {
    switch (align) {
      case "left":
        return "left-0";
      case "right":
        return "right-0";
      case "center":
        return "left-1/2 -translate-x-1/2";
      default:
        return "left-0";
    }
  };

  const sizeStyles = getSizeStyles();

  const handleOptionClick = (option: DropdownOption) => {
    option.onClick?.();
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* 触发按钮 */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          inline-flex
          items-center
          gap-1
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${triggerClassName}
        `}
      >
        {trigger}
        <RiArrowDownSLine
          size="1em"
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* 下拉菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`
              absolute
              top-full
              mt-2
              ${getAlignmentStyles()}
              ${sizeStyles.minWidth}
              bg-background
              border
              border-foreground/20
              rounded-md
              shadow-lg
              overflow-hidden
              z-50
            `}
          >
            <div className="py-1">
              {options.map((option, index) => (
                <button
                  key={option.value}
                  onClick={() => handleOptionClick(option)}
                  className={`
                    w-full
                    flex
                    items-center
                    gap-2
                    ${sizeStyles.item}
                    text-left
                    hover:bg-foreground/10
                    transition-colors
                    ${index !== options.length - 1 ? "" : ""}
                  `}
                >
                  {option.icon && (
                    <span className="flex-shrink-0">{option.icon}</span>
                  )}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
