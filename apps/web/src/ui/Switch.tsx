"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";

export interface SwitchProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "id" | "type" | "size"
  > {
  label?: string;
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

export function Switch({
  label,
  id,
  checked,
  defaultChecked,
  onCheckedChange,
  onChange,
  disabled = false,
  size = "md",
  className = "",
  ...props
}: SwitchProps) {
  const generatedId = useId();
  const switchId =
    id ||
    `switch-${label ? label.replace(/\s+/g, "-").toLowerCase() : "unlabeled"}-${generatedId}`;

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: "text-sm",
          track: "w-8 h-4",
          thumb: "w-3 h-3",
          translate: "translate-x-4",
        };
      case "md":
        return {
          container: "text-base",
          track: "w-11 h-6",
          thumb: "w-5 h-5",
          translate: "translate-x-5",
        };
      case "lg":
        return {
          container: "text-lg",
          track: "w-14 h-7",
          thumb: "w-6 h-6",
          translate: "translate-x-7",
        };
      default:
        return {
          container: "text-base",
          track: "w-11 h-6",
          thumb: "w-5 h-5",
          translate: "translate-x-5",
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
    const newChecked = event.target.checked;

    if (!isControlled) {
      setInternalChecked(newChecked);
    }

    onChange?.(event);
    onCheckedChange?.(newChecked);
  };

  const handleToggle = () => {
    if (disabled) return;

    const newChecked = !isChecked;

    if (!isControlled) {
      setInternalChecked(newChecked);
    }

    onCheckedChange?.(newChecked);

    // 触发 onChange 事件以保持兼容性
    const syntheticEvent = {
      target: { checked: newChecked },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange?.(syntheticEvent);
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <label
        htmlFor={switchId}
        className={`
          relative flex items-center ${label ? "gap-3" : ""} cursor-pointer select-none
          ${sizeStyles.container}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          type="checkbox"
          id={switchId}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />

        {/* 开关轨道 */}
        <motion.div
          className={`
            relative inline-flex items-center rounded-full
            ${sizeStyles.track}
            bg-muted-foreground/30
            transition-colors duration-200
            ${disabled ? "" : "hover:bg-muted-foreground/40"}
            cursor-pointer
          `}
          animate={{
            backgroundColor: isChecked
              ? "var(--color-primary)"
              : "var(--color-muted-foreground)",
          }}
          transition={{ duration: 0.2 }}
          onClick={handleToggle}
        >
          {/* 开关滑块 */}
          <motion.div
            className={`
              inline-block rounded-full bg-background shadow-lg
              ${sizeStyles.thumb}
            `}
            animate={{
              x: isChecked
                ? parseInt(sizeStyles.translate.replace("translate-x-", ""))
                : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 30,
            }}
            style={{
              position: "absolute",
              left: size === "sm" ? "2px" : size === "md" ? "3px" : "4px",
            }}
          />
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
