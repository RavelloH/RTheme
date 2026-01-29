"use client";

import React, { useId, useState } from "react";
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

type SwitchSize = "sm" | "md" | "lg";
type SizeTokens = {
  trackWidth: number;
  trackHeight: number;
  thumbSize: number;
  padding: number;
  text: string;
};

const SIZE_MAP: Record<SwitchSize, SizeTokens> = {
  sm: {
    trackWidth: 36,
    trackHeight: 20,
    thumbSize: 16,
    padding: 2,
    text: "text-sm",
  },
  md: {
    trackWidth: 46,
    trackHeight: 26,
    thumbSize: 20,
    padding: 2,
    text: "text-base",
  },
  lg: {
    trackWidth: 60,
    trackHeight: 32,
    thumbSize: 26,
    padding: 3,
    text: "text-lg",
  },
};

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
  const labelId = label ? `${switchId}-label` : undefined;

  const sizeTokens = SIZE_MAP[(size ?? "md") as SwitchSize] ?? SIZE_MAP.md;
  const thumbTranslate =
    sizeTokens.trackWidth - sizeTokens.thumbSize - sizeTokens.padding * 2;

  const isControlled = checked !== undefined;
  const [internalChecked, setInternalChecked] = useState(
    defaultChecked ?? false,
  );
  const isChecked = isControlled ? checked : internalChecked;

  const emitChange = (nextChecked: boolean) => {
    if (!isControlled) {
      setInternalChecked(nextChecked);
    }
    onCheckedChange?.(nextChecked);
    if (onChange) {
      const syntheticEvent = {
        target: { checked: nextChecked },
        currentTarget: { checked: nextChecked },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextChecked = event.target.checked;
    if (!isControlled) {
      setInternalChecked(nextChecked);
    }
    onChange?.(event);
    onCheckedChange?.(nextChecked);
  };

  const handleToggle = () => {
    if (disabled) return;
    emitChange(!isChecked);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-3 transition-opacity duration-500 ${
        disabled ? "opacity-60" : ""
      } ${className}`}
    >
      <input
        type="checkbox"
        id={switchId}
        checked={isChecked}
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        tabIndex={-1}
        {...props}
      />

      <button
        type="button"
        role="switch"
        aria-checked={isChecked ? "true" : "false"}
        aria-disabled={disabled ? "true" : "false"}
        aria-labelledby={labelId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          relative inline-flex items-center rounded-sm transition-all
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background
          ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
        `}
        style={{
          width: sizeTokens.trackWidth,
          height: sizeTokens.trackHeight,
          padding: sizeTokens.padding,
        }}
      >
        <span
          className={`absolute inset-0 rounded-sm transition-[opacity,colors] duration-500  ${
            isChecked
              ? "bg-primary"
              : "bg-foreground/30 dark:bg-muted-foreground/40"
          } ${disabled ? "opacity-70" : ""}`}
        />
        <motion.span
          className="relative rounded-sm bg-background shadow-md"
          style={{
            width: sizeTokens.thumbSize,
            height: sizeTokens.thumbSize,
          }}
          animate={{ x: isChecked ? thumbTranslate : 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
        />
      </button>

      {label && (
        <span
          id={labelId}
          className={`text-foreground select-none ${sizeTokens.text}`}
          onClick={() => !disabled && handleToggle()}
        >
          {label}
        </span>
      )}
    </div>
  );
}
