"use client";

import React, { forwardRef, useId, useState } from "react";
import { motion } from "framer-motion";

import { AutoTransition } from "@/ui/AutoTransition";

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
  labelAlwaysFloating?: boolean; // label 始终浮起（无高亮效果）
}

export const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  InputProps
>(function Input(
  {
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
    labelAlwaysFloating = false,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId =
    id || `input-${label.replace(/\s+/g, "-").toLowerCase()}-${generatedId}`;
  const [isFocused, setIsFocused] = useState(false);
  // 检查是否为受控组件（value prop 被传递）
  const isControlled = value !== undefined;
  const [internalHasValue, setInternalHasValue] = useState(!!defaultValue);

  // 在受控模式下，直接使用 value；在非受控模式下，使用内部状态
  const hasValue = isControlled ? !!value : internalHasValue;

  const isTextarea = rows !== undefined && rows > 1;

  // 自动启用 labelAlwaysFloating 的条件：
  // 1. 有 placeholder
  // 2. 类型是时间/日期相关（这些类型有默认的占位符）
  const timeRelatedTypes = ["date", "datetime-local", "time", "month", "week"];
  const autoFloating = !!placeholder || timeRelatedTypes.includes(type);
  const shouldLabelFloat = labelAlwaysFloating || autoFloating;

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
    // 只在非受控模式下更新内部状态
    if (!isControlled) {
      setInternalHasValue(!!e.target.value);
    }
    onChange?.(e as React.ChangeEvent<HTMLInputElement>);
  };

  const handleInput = (
    e: React.InputEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    // 只在非受控模式下更新内部状态
    if (!isControlled) {
      setInternalHasValue(
        !!(e.target as HTMLInputElement | HTMLTextAreaElement).value,
      );
    }
    onInput?.(e as React.InputEvent<HTMLInputElement>);
  };

  const showLabel = shouldLabelFloat || isFocused || hasValue || !!placeholder;
  const showBottomLine = isFocused || hasValue;
  // label 高亮：聚焦或有值时显示主题色
  const showLabelHighlight = isFocused || hasValue;

  // 计算helperText显示逻辑：label上升后且无内容时显示
  const labelAnimationDuration = 0.3 + label.length * 0.02; // 基础动画时长 + 字符延迟
  const shouldShowHelperText = showLabel && !hasValue && helperText;

  // 根据尺寸获取样式
  const getSizeStyles = () => {
    if (size === "sm") {
      return {
        container: "mt-6",
        input: "pb-2 mt-2 text-base",
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
      input: "pb-3 mt-3 text-xl",
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
    px-0 ${sizeStyles.input} text-foreground
    focus:outline-none
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-300 ease-in-out
    ${isTextarea ? "resize-y whitespace-pre-wrap wrap" : ""}
  `;

  return (
    <div className={`relative w-full ${sizeStyles.container} ${className}`}>
      {isTextarea ? (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
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
          ref={ref as React.Ref<HTMLInputElement>}
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
      <div
        className="absolute bottom-0 left-0 h-0.5 w-full transition-colors duration-300 ease-in-out"
        style={{
          backgroundColor: showBottomLine
            ? error
              ? "var(--theme-red)"
              : "var(--color-primary)"
            : "var(--color-foreground)",
        }}
      />
      <label
        htmlFor={inputId}
        className={`absolute ${sizeStyles.labelTop} left-0 pointer-events-none whitespace-nowrap flex items-center transition-opacity duration-500`}
        style={{
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon && (
          <motion.span
            className={`inline-block ${sizeStyles.labelIcon} min-w-2 pr-1 transition-colors duration-300 ease-in-out`}
            style={{
              color: showLabelHighlight
                ? "var(--color-primary)"
                : "var(--color-foreground)",
            }}
            initial={
              shouldLabelFloat ? { y: sizeStyles.labelShift } : undefined
            }
            animate={{
              y: showLabel ? sizeStyles.labelShift : 0,
            }}
            transition={{
              y: {
                duration: shouldLabelFloat ? 0 : 0.3,
                ease: [0.68, -0.55, 0.265, 1.55],
              },
            }}
          >
            {icon}
          </motion.span>
        )}
        {label.split("").map((char, index) => (
          <motion.span
            key={index}
            className={`inline-block ${sizeStyles.labelText} transition-colors duration-300 ease-in-out`}
            style={{
              color: showLabelHighlight
                ? "var(--color-primary)"
                : "var(--color-foreground)",
            }}
            initial={
              shouldLabelFloat
                ? {
                    y: sizeStyles.labelShift,
                    opacity: 1,
                  }
                : undefined
            }
            animate={{
              y: showLabel ? sizeStyles.labelShift : 0,
              opacity: 1,
            }}
            transition={{
              opacity: { duration: 0.3 },
              y: {
                duration: shouldLabelFloat ? 0 : 0.3,
                ease: [0.68, -0.55, 0.265, 1.55],
                delay: shouldLabelFloat ? 0 : index * 0.02,
              },
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
        <motion.span
          className={`inline-block ${sizeStyles.labelText} px-2 transition-colors duration-300 ease-in-out`}
          style={{
            color: showLabelHighlight
              ? "var(--color-primary)"
              : "var(--color-foreground)",
          }}
          initial={
            shouldLabelFloat
              ? {
                  y: sizeStyles.labelShift,
                  opacity: 1,
                }
              : undefined
          }
          animate={{
            y: showLabel ? sizeStyles.labelShift : 0,
            opacity: 1,
          }}
          transition={{
            opacity: { duration: 0.3 },
            y: {
              duration: shouldLabelFloat ? 0 : 0.3,
              ease: [0.68, -0.55, 0.265, 1.55],
            },
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
});
