"use client";

import React, { useId } from "react";
import { motion } from "framer-motion";

export interface ToggleProps
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
  id?: string;
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline";
  children?: React.ReactNode;
}

export function Toggle({
  id,
  pressed,
  defaultPressed = false,
  onPressedChange,
  disabled = false,
  size = "md",
  variant = "default",
  children,
  className = "",
  ...props
}: ToggleProps) {
  const generatedId = useId();
  const toggleId = id || `toggle-${generatedId}`;

  const isControlled = pressed !== undefined;
  const [internalPressed, setInternalPressed] = React.useState(defaultPressed);
  const isPressed = isControlled ? pressed : internalPressed;

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const newPressed = !isPressed;
    if (!isControlled) {
      setInternalPressed(newPressed);
    }
    onPressedChange?.(newPressed);
    props.onClick?.(event);
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "h-8 px-2 text-sm min-w-8";
      case "md":
        return "h-9 px-3 text-base min-w-9";
      case "lg":
        return "h-10 px-4 text-lg min-w-10";
      default:
        return "h-9 px-3 text-base min-w-9";
    }
  };

  const getVariantStyles = () => {
    if (variant === "outline") {
      return isPressed
        ? "bg-foreground text-background shadow-[inset_0_0_0_2px_var(--color-foreground)]"
        : "shadow-[inset_0_0_0_2px_var(--color-foreground)] text-foreground hover:bg-foreground/10";
    }
    // default variant
    return isPressed
      ? "bg-foreground text-background"
      : "text-foreground hover:bg-foreground/10 hover:text-foreground";
  };

  return (
    <motion.button
      id={toggleId}
      type="button"
      role="button"
      aria-pressed={isPressed}
      disabled={disabled}
      onClick={handleClick}
      className={`
        relative
        inline-flex
        items-center
        justify-center
        gap-2
        rounded-md
        font-medium
        transition-colors
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-primary
        focus-visible:ring-offset-2
        ${getSizeStyles()}
        ${getVariantStyles()}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${className}
      `}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Toggle Group 组件
export interface ToggleGroupProps {
  type: "single" | "multiple";
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ToggleGroup({
  type,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  className = "",
  children,
}: ToggleGroupProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | string[]>(
    defaultValue || (type === "single" ? "" : []),
  );

  const currentValue = isControlled ? value : internalValue;

  const handleValueChange = (itemValue: string) => {
    if (disabled) return;

    let newValue: string | string[];

    if (type === "single") {
      newValue = currentValue === itemValue ? "" : itemValue;
    } else {
      const currentArray = Array.isArray(currentValue) ? currentValue : [];
      newValue = currentArray.includes(itemValue)
        ? currentArray.filter((v) => v !== itemValue)
        : [...currentArray, itemValue];
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const isPressed = (itemValue: string) => {
    if (type === "single") {
      return currentValue === itemValue;
    }
    return Array.isArray(currentValue) && currentValue.includes(itemValue);
  };

  return (
    <div className={`inline-flex gap-1 ${className}`} role="group">
      {React.Children.map(children, (child) => {
        if (
          React.isValidElement<ToggleGroupItemProps>(child) &&
          child.type === ToggleGroupItem
        ) {
          const itemValue = child.props.value;
          return React.cloneElement(
            child as React.ReactElement<ToggleGroupItemProps>,
            {
              pressed: isPressed(itemValue),
              onPressedChange: () => handleValueChange(itemValue),
              disabled: disabled || child.props.disabled,
            },
          );
        }
        return child;
      })}
    </div>
  );
}

// Toggle Group Item 组件
export interface ToggleGroupItemProps extends Omit<ToggleProps, "pressed"> {
  value: string;
  pressed?: boolean;
}

export function ToggleGroupItem({ children, ...props }: ToggleGroupItemProps) {
  return <Toggle {...props}>{children}</Toggle>;
}
