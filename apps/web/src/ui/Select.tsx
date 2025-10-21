"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiArrowDownSLine } from "@remixicon/react";

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps {
  value: string | number;
  onChange: (value: string | number) => void;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
}

export function Select({
  value,
  onChange,
  options,
  className = "",
  disabled = false,
  size = "md",
  placeholder = "请选择",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<"down" | "up">(
    "down",
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // 判断下拉框展开方向
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isInUpperHalf = rect.top < viewportHeight / 2;
      setDropdownDirection(isInUpperHalf ? "down" : "up");
    }
  }, [isOpen]);

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
        return "px-3 py-1.5 text-sm";
      case "md":
        return "px-4 py-2 text-base";
      case "lg":
        return "px-5 py-2.5 text-lg";
      default:
        return "px-4 py-2 text-base";
    }
  };

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* 选择框按钮 */}
      <motion.button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          ${getSizeStyles()}
          relative
          inline-flex
          items-center
          justify-between
          gap-2
          rounded
          bg-muted
          text-foreground
          transition-colors
          hover:bg-muted/80
          focus:outline-none
          disabled:opacity-50
          disabled:cursor-not-allowed
          min-w-[120px]
        `}
        whileTap={!disabled ? { scale: 0.98 } : undefined}
      >
        <span className="flex-1 text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <RiArrowDownSLine size={20} />
        </motion.div>
      </motion.button>

      {/* 下拉选项列表 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: dropdownDirection === "down" ? -10 : 10,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: dropdownDirection === "down" ? -10 : 10,
            }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 w-full rounded bg-muted shadow-lg overflow-hidden ${
              dropdownDirection === "down"
                ? "mt-2 top-full"
                : "mb-2 bottom-full"
            }`}
          >
            <div className="max-h-[240px] overflow-y-auto overflow-x-hidden">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`
                      ${getSizeStyles()}
                      w-full
                      text-left
                      transition-colors
                      hover:bg-primary
                      hover:text-primary-foreground
                      ${isSelected ? "bg-primary/20 text-primary" : "text-foreground"}
                    `}
                    whileHover={{ scaleX: 1.1 }}
                    transition={{ duration: 0.15 }}
                  >
                    {option.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
