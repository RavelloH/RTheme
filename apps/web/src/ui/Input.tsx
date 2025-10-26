"use client";

import React, { useState, useId } from "react";
import { motion } from "framer-motion";
import { AutoTransition } from "./AutoTransition";

export interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement> &
      React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    "id" | "size"
  > {
  label: string;
  icon?: React.ReactNode;
  id?: string;
  error?: boolean;
  helperText?: string;
  tips?: string;
  size?: "sm" | "md";
  rows?: number;
}

export function Input({
  label,
  icon,
  id,
  error = false,
  helperText,
  className = "",
  type = "text",
  required = false,
  tips,
  minLength,
  maxLength,
  pattern,
  placeholder,
  value,
  defaultValue,
  onChange,
  onInput,
  onFocus,
  onBlur,
  disabled = false,
  readOnly = false,
  size = "md",
  rows,
  ...props
}: InputProps) {
  const inputId =
    id || `input-${label.replace(/\s+/g, "-").toLowerCase()}-${useId()}`;
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!defaultValue || !!value);

  const isTextarea = rows !== undefined && rows > 1;

  const handleFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setIsFocused(true);
    onFocus?.(e as React.FocusEvent<HTMLInputElement>);
  };

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setIsFocused(false);
    onBlur?.(e as React.FocusEvent<HTMLInputElement>);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setHasValue(!!e.target.value);
    onChange?.(e as React.ChangeEvent<HTMLInputElement>);
  };

  const handleInput = (
    e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setHasValue(!!(e.target as HTMLInputElement | HTMLTextAreaElement).value);
    onInput?.(e as React.FormEvent<HTMLInputElement>);
  };

  const showLabel = isFocused || hasValue;
  const showBottomLine = isFocused || hasValue;

  // 计算helperText显示逻辑：label上升后且无内容时显示
  const labelAnimationDuration = 0.3 + label.length * 0.02; // 基础动画时长 + 字符延迟
  const shouldShowHelperText = showLabel && !hasValue && helperText;

  // 根据尺寸获取样式
  const getSizeStyles = () => {
    if (size === "sm") {
      return {
        container: "mt-6",
        input: "py-2 text-base",
        labelTop: "top-2",
        labelText: "text-base",
        labelIcon: "text-base",
        labelShift: "-1.2em",
        helperTop: "top-2.5",
        helperText: "text-sm",
      };
    }
    // md (默认)
    return {
      container: "mt-8",
      input: "py-3 text-xl",
      labelTop: "top-3",
      labelText: "text-xl",
      labelIcon: "text-xl",
      labelShift: "-1.35em",
      helperTop: "top-4",
      helperText: "text-lg",
    };
  };

  const sizeStyles = getSizeStyles();

  const inputClassName = `
    relative w-full bg-transparent border-0
    px-0 ${sizeStyles.input} text-white
    focus:outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    ${isTextarea ? "resize-none" : ""}
  `;

  return (
    <div className={`relative w-full ${sizeStyles.container} ${className}`}>
      {isTextarea ? (
        <textarea
          id={inputId}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={handleInputChange}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          className={inputClassName}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          type={type}
          id={inputId}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          pattern={pattern}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={handleInputChange}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          readOnly={readOnly}
          className={inputClassName}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      )}
      {/* 横向颜色变化效果 */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 w-full"
        initial={{ opacity: 1, backgroundColor: "#ffffff" }}
        animate={{
          opacity: 1,
          backgroundColor: showBottomLine
            ? error
              ? "var(--theme-red)"
              : "var(--color-primary)"
            : "#ffffff",
        }}
        transition={{
          duration: 0.3,
        }}
      />
      <label
        htmlFor={inputId}
        className={`absolute ${sizeStyles.labelTop} left-0 pointer-events-none whitespace-nowrap flex items-center`}
      >
        {icon && (
          <motion.span
            className={`inline-block ${sizeStyles.labelIcon} min-w-2 text-white pr-1`}
            animate={{
              color: showLabel ? "var(--color-primary)" : "#ffffff",
              y: showLabel ? sizeStyles.labelShift : 0,
            }}
            transition={{
              duration: 0.3,
              ease: [0.68, -0.55, 0.265, 1.55],
              delay: 0,
            }}
          >
            {icon}
          </motion.span>
        )}
        {label.split("").map((char, index) => (
          <motion.span
            key={index}
            className={`inline-block ${sizeStyles.labelText} min-w-2 text-white`}
            animate={{
              color: showLabel ? "var(--color-primary)" : "#ffffff",
              y: showLabel ? sizeStyles.labelShift : 0,
              opacity: 1,
            }}
            transition={{
              duration: 0.3,
              ease: [0.68, -0.55, 0.265, 1.55],
              delay: index * 0.02,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
        <motion.span
          className={`inline-block ${sizeStyles.labelText} min-w-2 text-white px-2`}
          animate={{
            color: showLabel ? "var(--color-primary)" : "#ffffff",
            y: showLabel ? sizeStyles.labelShift : 0,
            opacity: 1,
          }}
          transition={{
            duration: 0.3,
            ease: [0.68, -0.55, 0.265, 1.55],
          }}
        >
          <AutoTransition duration={0.3}>{tips}</AutoTransition>
        </motion.span>
      </label>

      {helperText && (
        <motion.div
          className={`absolute ${sizeStyles.helperTop} left-0 pointer-events-none text-muted-foreground ${sizeStyles.helperText} whitespace-nowrap overflow-hidden text-ellipsis max-w-full`}
          initial={{ opacity: 0, y: 0 }}
          animate={{
            opacity: shouldShowHelperText ? 1 : 0,
            y: shouldShowHelperText ? 0 : 5,
          }}
          transition={{
            opacity: {
              duration: 0.3,
              delay: shouldShowHelperText ? labelAnimationDuration : 0,
            },
            y: {
              duration: 0.2,
              delay: shouldShowHelperText ? labelAnimationDuration : 0,
            },
          }}
        >
          {helperText}
        </motion.div>
      )}
    </div>
  );
}
