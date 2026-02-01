"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export interface OtpInputProps {
  /** OTP 长度 */
  length?: number;
  /** 当前值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 完成输入回调 */
  onComplete?: (value: string) => void;
  /** 是否显示错误状态 */
  error?: boolean;
  /** 输入框大小 */
  size?: "sm" | "md" | "lg";
  /** 自定义类名 */
  className?: string;
  /** 是否自动聚焦到第一个输入框 */
  autoFocus?: boolean;
}

/**
 * OTP 验证码输入组件
 *
 * 支持自动聚焦、粘贴、键盘导航等功能
 *
 * @example
 * ```tsx
 * <OtpInput
 *   length={6}
 *   value={otpCode}
 *   onChange={setOtpCode}
 *   onComplete={(code) => console.log('完成:', code)}
 * />
 * ```
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  onComplete,
  error = false,
  size = "md",
  className = "",
  autoFocus = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [localValue, setLocalValue] = useState<string[]>(
    Array(length).fill(""),
  );
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // 同步外部 value 到内部状态
  useEffect(() => {
    const digits = value.split("").slice(0, length);
    const newLocalValue = [
      ...digits,
      ...Array(length - digits.length).fill(""),
    ];
    setLocalValue(newLocalValue);
  }, [value, length]);

  // 自动聚焦到第一个输入框
  useEffect(() => {
    if (autoFocus && !disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: "w-10 h-12",
          text: "text-lg",
        };
      case "md":
        return {
          container: "w-12 h-14",
          text: "text-2xl",
        };
      case "lg":
        return {
          container: "w-14 h-16",
          text: "text-3xl",
        };
      default:
        return {
          container: "w-12 h-14",
          text: "text-2xl",
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const handleChange = (index: number, digit: string) => {
    // 只允许输入数字
    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const newValue = [...localValue];
    newValue[index] = digit;
    setLocalValue(newValue);

    const newStringValue = newValue.join("");
    onChange(newStringValue);

    // 如果输入了数字，自动聚焦到下一个输入框
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // 如果所有输入框都填满了，触发 onComplete
    if (newStringValue.length === length && onComplete) {
      onComplete(newStringValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!localValue[index] && index > 0) {
        // 如果当前输入框为空，删除前一个输入框的内容
        const newValue = [...localValue];
        newValue[index - 1] = "";
        setLocalValue(newValue);
        onChange(newValue.join(""));
        inputRefs.current[index - 1]?.focus();
      } else if (localValue[index]) {
        // 如果当前输入框有内容，删除当前内容
        const newValue = [...localValue];
        newValue[index] = "";
        setLocalValue(newValue);
        onChange(newValue.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain");
    const digits = pastedData.replace(/\D/g, "").slice(0, length);

    if (digits) {
      const newValue = digits.split("");
      const paddedValue = [
        ...newValue,
        ...Array(length - newValue.length).fill(""),
      ];
      setLocalValue(paddedValue);
      onChange(digits);

      // 聚焦到最后一个有值的输入框或下一个空输入框
      const nextEmptyIndex = Math.min(digits.length, length - 1);
      inputRefs.current[nextEmptyIndex]?.focus();

      // 如果粘贴的内容填满了所有输入框，触发 onComplete
      if (digits.length === length && onComplete) {
        onComplete(digits);
      }
    }
  };

  return (
    <div className={`flex gap-2 justify-center ${className}`}>
      {Array.from({ length }).map((_, index) => {
        const isFocused = focusedIndex === index;
        const hasValue = !!localValue[index];

        return (
          <motion.div
            key={index}
            className="relative"
            initial={false}
            animate={{
              scale: isFocused ? 1.05 : 1,
            }}
            transition={{
              duration: 0.2,
              ease: "easeOut",
            }}
          >
            <input
              title={`第 ${index + 1} 位验证码`}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={localValue[index] || ""}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(-1)}
              disabled={disabled}
              className={`
                ${sizeStyles.container} ${sizeStyles.text}
                text-center font-semibold
                bg-background
                border-2 rounded-sm
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  error
                    ? "border-error text-error"
                    : isFocused
                      ? "border-primary"
                      : hasValue
                        ? "border-foreground"
                        : "border-muted-foreground/50"
                }
              `}
              autoComplete="off"
            />
          </motion.div>
        );
      })}
    </div>
  );
}

export interface BackupCodeInputProps {
  /** 当前值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 完成输入回调 */
  onComplete?: (value: string) => void;
  /** 是否显示错误状态 */
  error?: boolean;
  /** 输入框大小 */
  size?: "sm" | "md" | "lg";
  /** 自定义类名 */
  className?: string;
  /** 是否自动聚焦 */
  autoFocus?: boolean;
}

/**
 * 备份码输入组件（XXXX-XXXX 格式）
 *
 * @example
 * ```tsx
 * <BackupCodeInput
 *   value={backupCode}
 *   onChange={setBackupCode}
 * />
 * ```
 */
export function BackupCodeInput({
  value,
  onChange,
  disabled = false,
  onComplete,
  error = false,
  size = "md",
  className = "",
  autoFocus = false,
}: BackupCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [localValue, setLocalValue] = useState<string[]>(Array(8).fill(""));
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // 同步外部 value 到内部状态
  useEffect(() => {
    const cleanValue = value.replace(/\D/g, ""); // 移除非数字字符
    const digits = cleanValue.split("").slice(0, 8);
    const newLocalValue = [...digits, ...Array(8 - digits.length).fill("")];
    setLocalValue(newLocalValue);
  }, [value]);

  // 自动聚焦到第一个输入框
  useEffect(() => {
    if (autoFocus && !disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          container: "w-10 h-12",
          text: "text-lg",
        };
      case "md":
        return {
          container: "w-12 h-14",
          text: "text-2xl",
        };
      case "lg":
        return {
          container: "w-14 h-16",
          text: "text-3xl",
        };
      default:
        return {
          container: "w-12 h-14",
          text: "text-2xl",
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const handleChange = (index: number, digit: string) => {
    // 只允许输入数字
    if (digit && !/^\d$/.test(digit)) {
      return;
    }

    const newValue = [...localValue];
    newValue[index] = digit;
    setLocalValue(newValue);

    const newStringValue = newValue.join("");
    // 格式化为 XXXX-XXXX
    const formatted =
      newStringValue.length > 4
        ? newStringValue.slice(0, 4) + "-" + newStringValue.slice(4)
        : newStringValue;
    onChange(formatted);

    // 如果输入了数字，自动聚焦到下一个输入框
    if (digit && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }

    // 如果所有输入框都填满了，触发 onComplete
    if (newStringValue.length === 8 && onComplete) {
      onComplete(formatted);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace") {
      if (!localValue[index] && index > 0) {
        // 如果当前输入框为空，删除前一个输入框的内容
        const newValue = [...localValue];
        newValue[index - 1] = "";
        setLocalValue(newValue);
        const newStringValue = newValue.join("");
        const formatted =
          newStringValue.length > 4
            ? newStringValue.slice(0, 4) + "-" + newStringValue.slice(4)
            : newStringValue;
        onChange(formatted);
        inputRefs.current[index - 1]?.focus();
      } else if (localValue[index]) {
        // 如果当前输入框有内容，删除当前内容
        const newValue = [...localValue];
        newValue[index] = "";
        setLocalValue(newValue);
        const newStringValue = newValue.join("");
        const formatted =
          newStringValue.length > 4
            ? newStringValue.slice(0, 4) + "-" + newStringValue.slice(4)
            : newStringValue;
        onChange(formatted);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain");
    const digits = pastedData.replace(/\D/g, "").slice(0, 8);

    if (digits) {
      const newValue = digits.split("");
      const paddedValue = [...newValue, ...Array(8 - newValue.length).fill("")];
      setLocalValue(paddedValue);
      const formatted =
        digits.length > 4 ? digits.slice(0, 4) + "-" + digits.slice(4) : digits;
      onChange(formatted);

      // 聚焦到最后一个有值的输入框或下一个空输入框
      const nextEmptyIndex = Math.min(digits.length, 7);
      inputRefs.current[nextEmptyIndex]?.focus();

      // 如果粘贴的内容填满了所有输入框，触发 onComplete
      if (digits.length === 8 && onComplete) {
        onComplete(formatted);
      }
    }
  };

  return (
    <div className={`flex gap-2 justify-center items-center ${className}`}>
      {Array.from({ length: 8 }).map((_, index) => {
        const isFocused = focusedIndex === index;
        const hasValue = !!localValue[index];

        return (
          <React.Fragment key={index}>
            {/* 在第 4 个输入框后添加横杠 */}
            {index === 4 && (
              <div className="text-2xl font-semibold text-muted-foreground px-1">
                -
              </div>
            )}
            <motion.div
              className="relative"
              initial={false}
              animate={{
                scale: isFocused ? 1.05 : 1,
              }}
              transition={{
                duration: 0.2,
                ease: "easeOut",
              }}
            >
              <input
                title={`第 ${index + 1} 位备份码`}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={localValue[index] || ""}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(-1)}
                disabled={disabled}
                className={`
                  ${sizeStyles.container} ${sizeStyles.text}
                  text-center font-semibold
                  bg-background
                  border-2 rounded-sm
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${
                    error
                      ? "border-error text-error"
                      : isFocused
                        ? "border-primary"
                        : hasValue
                          ? "border-foreground"
                          : "border-foreground/20"
                  }
                `}
                autoComplete="off"
              />
            </motion.div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
