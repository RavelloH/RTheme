"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";

export interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "id" | "type" | "size"
  > {
  label?: string;
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Checkbox({
  label,
  id,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  size = "md",
  className = "",
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId =
    id ||
    `checkbox-${label ? label.replace(/\s+/g, "-").toLowerCase() : "unlabeled"}-${generatedId}`;

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: "text-sm",
          box: "w-3.5 h-3.5",
          checkmark: "w-3.5 h-3.5",
        };
      case "md":
        return {
          container: "text-base",
          box: "w-4 h-4",
          checkmark: "w-4 h-4",
        };
      case "lg":
        return {
          container: "text-lg",
          box: "w-5 h-5",
          checkmark: "w-5 h-5",
        };
      default:
        return {
          container: "text-base",
          box: "w-4 h-4",
          checkmark: "w-4 h-4",
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = React.useState(
    defaultChecked || false,
  );
  const isChecked = isControlled ? checked : internalChecked;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInternalChecked(event.target.checked);
    }
    onChange?.(event);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <label
        htmlFor={checkboxId}
        className={`
          relative flex items-center ${label ? "gap-2" : ""} cursor-pointer select-none
          ${sizeStyles.container}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          type="checkbox"
          id={checkboxId}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />

        {/* 复选框容器 */}
        <motion.div
          className={`
            relative flex items-center justify-center
            ${sizeStyles.box}
            bg-background
            border-2
            transition-colors duration-200
            ${disabled ? "" : "hover:border-primary/50"}
          `}
          animate={{
            borderColor: isChecked
              ? "var(--color-primary)"
              : "var(--color-foreground)",
          }}
          transition={{ duration: 0.15 }}
        >
          {/* 选中状态的对勾 */}
          <motion.svg
            className={`absolute ${sizeStyles.checkmark} pointer-events-none`}
            viewBox="0 0 16 16"
            fill="none"
            initial={false}
            animate={{
              opacity: isChecked ? 1 : 0,
              scale: isChecked ? 1 : 0.8,
            }}
            transition={{
              duration: 0.15,
              ease: "easeInOut",
            }}
          >
            <motion.path
              d="M3 8L6.5 11.5L13 4.5"
              stroke="var(--color-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: isChecked ? 1 : 0 }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
              }}
            />
          </motion.svg>
        </motion.div>

        {/* 标签文字 */}
        {label && (
          <motion.span
            className="text-foreground select-none"
            animate={{
              color: disabled
                ? "var(--color-muted-foreground)"
                : "var(--color-foreground)",
            }}
          >
            {label}
          </motion.span>
        )}
      </label>
    </div>
  );
}
