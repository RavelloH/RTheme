"use client";

import type {
  ComponentPropsWithoutRef,
  HTMLAttributes,
  MutableRefObject,
  ReactNode,
  Ref,
} from "react";
import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

type PopoverSide = "top" | "bottom" | "left" | "right";
type PopoverAlign = "start" | "center" | "end";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: MutableRefObject<HTMLElement | null>;
  contentRef: MutableRefObject<HTMLDivElement | null>;
  triggerId: string;
  contentId: string;
  side: PopoverSide;
  align: PopoverAlign;
  sideOffset: number;
  alignOffset: number;
  sameWidth: boolean;
  collisionPadding: number;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

export interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
  alignOffset?: number;
  sameWidth?: boolean;
  collisionPadding?: number;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
}

export function Popover({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  side = "bottom",
  align = "center",
  sideOffset = 8,
  alignOffset = 0,
  sameWidth = false,
  collisionPadding = 8,
  closeOnEscape = true,
  closeOnOutsideClick = true,
}: PopoverProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const baseId = useId();
  const triggerId = `popover-trigger-${baseId}`;
  const contentId = `popover-content-${baseId}`;

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [controlledOpen, onOpenChange],
  );

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, closeOnEscape, setOpen]);

  useEffect(() => {
    if (!open || !closeOnOutsideClick) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const triggerEl = triggerRef.current;
      const contentEl = contentRef.current;

      if (
        (triggerEl && triggerEl.contains(target)) ||
        (contentEl && contentEl.contains(target))
      ) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, closeOnOutsideClick, setOpen]);

  const value = useMemo<PopoverContextValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
      triggerId,
      contentId,
      side,
      align,
      sideOffset,
      alignOffset,
      sameWidth,
      collisionPadding,
    }),
    [
      open,
      setOpen,
      triggerId,
      contentId,
      side,
      align,
      sideOffset,
      alignOffset,
      sameWidth,
      collisionPadding,
    ],
  );

  return (
    <PopoverContext.Provider value={value}>{children}</PopoverContext.Provider>
  );
}

function usePopoverContext(component: string): PopoverContextValue {
  const context = useContext(PopoverContext);
  if (!context) {
    throw new Error(`${component} 必须在 <Popover> 组件内使用`);
  }
  return context;
}

export interface PopoverTriggerProps extends HTMLAttributes<HTMLElement> {
  asChild?: boolean;
  disabled?: boolean;
}

export const PopoverTrigger = forwardRef<HTMLElement, PopoverTriggerProps>(
  ({ children, asChild = false, disabled = false, ...props }, forwardedRef) => {
    const context = usePopoverContext("PopoverTrigger");

    const setTriggerRef = useCallback(
      (node: HTMLElement | null) => {
        context.triggerRef.current = node;
      },
      [context],
    );

    const mergedRef = composeRefs(forwardedRef, setTriggerRef);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      props.onClick?.(event);
      if (event.defaultPrevented || disabled) return;
      context.setOpen(!context.open);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
      props.onKeyDown?.(event);
      if (event.defaultPrevented || disabled) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        context.setOpen(!context.open);
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        context.setOpen(true);
      }

      if (event.key === "Escape") {
        context.setOpen(false);
      }
    };

    const triggerProps = {
      ...props,
      id: context.triggerId,
      ref: mergedRef,
      role: props.role ?? "button",
      tabIndex: props.tabIndex ?? 0,
      "aria-haspopup": props["aria-haspopup"] ?? "dialog",
      "aria-expanded": context.open,
      "aria-controls": context.open ? context.contentId : undefined,
      "data-state": context.open ? "open" : "closed",
      onClick: handleClick,
      onKeyDown: handleKeyDown,
    };

    if (asChild && React.isValidElement(children)) {
      type ChildElement = React.ReactElement<
        Record<string, unknown>,
        string | React.JSXElementConstructor<unknown>
      > & { ref?: Ref<HTMLElement> | string | null };

      const child = children as ChildElement;
      const existingRef =
        child.ref && typeof child.ref !== "string" ? child.ref : null;
      const mergedChildRef = existingRef
        ? composeRefs(existingRef, mergedRef)
        : mergedRef;

      return React.cloneElement(child, {
        ...triggerProps,
        ref: mergedChildRef,
      });
    }

    return (
      <button type="button" disabled={disabled} {...triggerProps}>
        {children}
      </button>
    );
  },
);

PopoverTrigger.displayName = "PopoverTrigger";

interface PositionState {
  top: number;
  left: number;
  width?: number;
  transformOrigin: string;
}

type MotionDivProps = ComponentPropsWithoutRef<typeof motion.div>;

export interface PopoverContentProps extends Omit<MotionDivProps, "ref"> {
  side?: PopoverSide;
  align?: PopoverAlign;
  sideOffset?: number;
  alignOffset?: number;
  sameWidth?: boolean;
  collisionPadding?: number;
  container?: HTMLElement | null;
  forceMount?: boolean;
}

export const PopoverContent = forwardRef<HTMLDivElement, PopoverContentProps>(
  (
    {
      children,
      className = "",
      side,
      align,
      sideOffset,
      alignOffset,
      sameWidth,
      collisionPadding,
      container,
      forceMount = false,
      style,
      ...props
    },
    forwardedRef,
  ) => {
    const context = usePopoverContext("PopoverContent");
    const [mounted, setMounted] = useState(false);
    const [position, setPosition] = useState<PositionState | null>(null);

    const resolvedSide = side ?? context.side;
    const resolvedAlign = align ?? context.align;
    const resolvedSideOffset = sideOffset ?? context.sideOffset;
    const resolvedAlignOffset = alignOffset ?? context.alignOffset;
    const resolvedSameWidth = sameWidth ?? context.sameWidth;
    const resolvedCollisionPadding =
      collisionPadding ?? context.collisionPadding;

    useEffect(() => {
      setMounted(true);
    }, []);

    useLayoutEffect(() => {
      if (!context.open) {
        setPosition(null);
        return;
      }

      const updatePosition = () => {
        const trigger = context.triggerRef.current;
        const content = context.contentRef.current;
        if (!trigger || !content) return;

        const triggerRect = trigger.getBoundingClientRect();
        const contentRect = content.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const desiredWidth = resolvedSameWidth
          ? triggerRect.width
          : contentRect.width;
        const contentHeight = contentRect.height;

        let top = triggerRect.top;
        let left = triggerRect.left;
        let originX: "left" | "center" | "right" = "center";
        let originY: "top" | "center" | "bottom" = "center";

        switch (resolvedSide) {
          case "top":
            top = triggerRect.top - contentHeight - resolvedSideOffset;
            originY = "bottom";
            break;
          case "bottom":
            top = triggerRect.bottom + resolvedSideOffset;
            originY = "top";
            break;
          case "left":
            left = triggerRect.left - desiredWidth - resolvedSideOffset;
            originX = "right";
            break;
          case "right":
            left = triggerRect.right + resolvedSideOffset;
            originX = "left";
            break;
        }

        if (resolvedSide === "top" || resolvedSide === "bottom") {
          switch (resolvedAlign) {
            case "start":
              left = triggerRect.left;
              originX = "left";
              break;
            case "end":
              left = triggerRect.right - desiredWidth;
              originX = "right";
              break;
            default:
              left =
                triggerRect.left + triggerRect.width / 2 - desiredWidth / 2;
              originX = "center";
          }
          left += resolvedAlignOffset;
        } else {
          switch (resolvedAlign) {
            case "start":
              top = triggerRect.top;
              originY = "top";
              break;
            case "end":
              top = triggerRect.bottom - contentHeight;
              originY = "bottom";
              break;
            default:
              top =
                triggerRect.top + triggerRect.height / 2 - contentHeight / 2;
              originY = "center";
          }
          top += resolvedAlignOffset;
        }

        const minTop = resolvedCollisionPadding;
        const maxTop = Math.max(
          resolvedCollisionPadding,
          viewportHeight - contentHeight - resolvedCollisionPadding,
        );
        const minLeft = resolvedCollisionPadding;
        const maxLeft = Math.max(
          resolvedCollisionPadding,
          viewportWidth - desiredWidth - resolvedCollisionPadding,
        );

        const clampedTop = clamp(top, minTop, maxTop);
        const clampedLeft = clamp(left, minLeft, maxLeft);

        setPosition({
          top: clampedTop,
          left: clampedLeft,
          width: resolvedSameWidth ? triggerRect.width : undefined,
          transformOrigin: `${originY} ${originX}`,
        });
      };

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [
      context,
      resolvedSide,
      resolvedAlign,
      resolvedSideOffset,
      resolvedAlignOffset,
      resolvedSameWidth,
      resolvedCollisionPadding,
    ]);

    const setContentRef = useCallback(
      (node: HTMLDivElement | null) => {
        context.contentRef.current = node;
      },
      [context],
    );

    const mergedRef = composeRefs(forwardedRef, setContentRef);

    const shouldRender = forceMount || context.open;
    const portalTarget =
      container ?? (typeof document !== "undefined" ? document.body : null);

    if (!mounted || !portalTarget) {
      return null;
    }

    const content = (
      <AnimatePresence>
        {shouldRender && (
          <motion.div
            ref={mergedRef}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{
              opacity: 1,
              scale: 1,
              transition: { duration: 0.18, ease: "easeOut" },
            }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            className={`z-50 rounded-sm border border-foreground/10 bg-background text-foreground shadow-2xl backdrop-blur-xl ${className}`}
            style={{
              position: "fixed",
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              width: position?.width,
              visibility: position ? "visible" : "hidden",
              transformOrigin: position?.transformOrigin,
              ...style,
            }}
            data-state={context.open ? "open" : "closed"}
            role="dialog"
            aria-labelledby={context.triggerId}
            aria-describedby={props["aria-describedby"]}
            {...props}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );

    return createPortal(content, portalTarget);
  },
);

PopoverContent.displayName = "PopoverContent";

function composeRefs<T>(
  ...refs: Array<Ref<T> | ((instance: T | null) => void) | undefined>
) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === "function") {
        ref(node);
      } else if (typeof ref === "object") {
        (ref as MutableRefObject<T | null>).current = node;
      }
    });
  };
}

function clamp(value: number, min: number, max: number) {
  if (max <= min) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export { usePopoverContext };
