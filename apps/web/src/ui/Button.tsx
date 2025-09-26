"use client";

import React from "react";
import { motion } from "framer-motion";

export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    | "id"
    | "onDrag"
    | "onDragStart"
    | "onDragEnd"
    | "onDragOver"
    | "onDragEnter"
    | "onDragLeave"
    | "onDrop"
    | "onAnimationStart"
    | "onAnimationEnd"
    | "onAnimationIteration"
    | "onTransitionEnd"
  > {
  label: string;
  id?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean | number;
  loadingText?: string;
  fullWidth?: boolean;
}

export function Button({
  label,
  id,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  loadingText,
  fullWidth = false,
  className = "",
  disabled = false,
  onClick,
  type = "button",
  ...props
}: ButtonProps) {
  const buttonId =
    id ||
    `button-${label.replace(/\s+/g, "-").toLowerCase()}-${Math.random().toString(36).slice(2, 11)}`;

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-primary text-primary-foreground hover:opacity-80";
      case "secondary":
        return "bg-foreground text-background hover:opacity-80";
      case "outline":
        return "border-2 border-foreground text-foreground hover:bg-foreground hover:text-primary-foreground";
      case "ghost":
        return "text-foreground hover:bg-foreground hover:text-background";
      case "danger":
        return "bg-[var(--theme-red)] text-white hover:opacity-80";
      default:
        return "bg-foreground text-background hover:opacity-80";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "px-4 py-2 text-lg min-h-[36px]";
      case "md":
        return "px-6 py-2 text-xl";
      case "lg":
        return "px-6 py-3 text-xl";
      default:
        return "px-4 py-2 text-lg min-h-[44px]";
    }
  };

  const isLoading =
    typeof loading === "boolean" ? loading : loading >= 0 && loading <= 100;
  const displayText = loadingText && isLoading ? loadingText : label;
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      id={buttonId}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`
        relative
        inline-flex
        items-center
        justify-center
        gap-2
        tracking-widest
        rounded-sm
        transition-all
        hover:cursor-pointer
        duration-200
        disabled:opacity-60
        disabled:cursor-not-allowed
        ${loading ? "disabled:cursor-progress" : ""}
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      // whileHover={!isDisabled ? { opacity: 0.9 } : {}}
      // whileTap={!isDisabled ? { opacity: 0.5 } : {}}
      {...props}
    >
      {isLoading && !loadingText && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-inherit rounded-md overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </motion.div>
      )}

      <div
        className={`flex items-center gap-2 ${isLoading && !loadingText ? "invisible" : ""}`}
      >
        {icon && iconPosition === "left" && (
          <motion.span
            className="inline-flex"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {icon}
          </motion.span>
        )}

        <span>{displayText}</span>

        {icon && iconPosition === "right" && (
          <motion.span
            className="inline-flex"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {icon}
          </motion.span>
        )}
      </div>
    </motion.button>
  );
}
