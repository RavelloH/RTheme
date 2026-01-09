"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  direcation?: "down" | "up";
  placeholder?: string;
}

export function Select({
  value,
  onChange,
  options,
  className = "",
  disabled = false,
  size = "md",
  direcation,
  placeholder = "请选择",
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState<"down" | "up">(
    "down",
  );
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  }>({ top: 0, left: 0, width: 0 });
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // 确保组件已挂载（用于 Portal）
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 更新下拉框位置
  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  // 判断下拉框展开方向
  useEffect(() => {
    if (isOpen && containerRef.current) {
      updateDropdownPosition();

      if (direcation) {
        setDropdownDirection(direcation);
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isInUpperHalf = rect.top < viewportHeight / 2;
      setDropdownDirection(isInUpperHalf ? "down" : "up");
    }
  }, [isOpen, direcation]);

  // 监听滚动和窗口大小变化，更新下拉框位置
  useEffect(() => {
    if (isOpen) {
      const handleUpdate = () => updateDropdownPosition();
      window.addEventListener("scroll", handleUpdate, true);
      window.addEventListener("resize", handleUpdate);
      return () => {
        window.removeEventListener("scroll", handleUpdate, true);
        window.removeEventListener("resize", handleUpdate);
      };
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

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "px-4 py-1.5 text-md";
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

  // 渲染下拉菜单
  const renderDropdown = () => {
    if (!isMounted) return null;

    const dropdownStyle: React.CSSProperties = {
      position: "fixed",
      top:
        dropdownDirection === "down" ? `${dropdownPosition.top + 4}px` : "auto",
      bottom:
        dropdownDirection === "up"
          ? `${window.innerHeight - dropdownPosition.top + window.scrollY + 4}px`
          : "auto",
      left: `${dropdownPosition.left}px`,
      width: `${dropdownPosition.width}px`,
      zIndex: 9999,
    };

    return createPortal(
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
            style={dropdownStyle}
            className="bg-background/90 border-border border-1 backdrop-blur-sm shadow-lg rounded overflow-hidden"
          >
            <div className="max-h-[240px] overflow-y-auto overflow-x-hidden">
              {options.length === 0 && (
                <div className="px-4 py-2 text-muted-foreground text-sm">
                  暂无选项
                </div>
              )}
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
                    whileHover={{ scaleX: 1.02 }}
                    transition={{ duration: 0.15 }}
                  >
                    {option.label}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );
  };

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* 选择框按钮 */}
      <div className="relative">
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
            bg-transparent
            border-0
            text-foreground
            focus:outline-none
            disabled:opacity-50
            disabled:cursor-not-allowed
            min-w-[120px]
            w-full
          `}
        >
          <span className="flex-1 text-left">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <motion.div
            animate={{
              rotate: isOpen
                ? dropdownDirection === "down"
                  ? 180
                  : 0
                : dropdownDirection === "down"
                  ? 0
                  : 180,
            }}
            transition={{ duration: 0.2 }}
          >
            <RiArrowDownSLine size={"1.25em"} />
          </motion.div>
        </motion.button>

        {/* 底部横线 */}
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 w-full"
          animate={{
            backgroundColor: isOpen
              ? "var(--color-primary)"
              : "var(--color-foreground)",
          }}
          transition={{
            duration: 0.3,
          }}
        />
      </div>

      {/* 下拉选项列表（通过 Portal 渲染到 body） */}
      {renderDropdown()}
    </div>
  );
}
