"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  ReactNode,
  HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RiArrowRightSLine, RiCheckLine } from "@remixicon/react";

// ============================================
// Context
// ============================================

interface MenuContextValue {
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  orientation: "horizontal" | "vertical";
}

const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(component: string): MenuContextValue {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error(`${component} 必须在 <Menu> 组件内使用`);
  }
  return context;
}

// ============================================
// Menu (Root)
// ============================================

export interface MenuProps {
  children: ReactNode;
  className?: string;
  orientation?: "horizontal" | "vertical";
  defaultValue?: string;
  onValueChange?: (value: string | null) => void;
}

/**
 * Menu 菜单组件的根容器
 *
 * 支持水平和垂直两种布局方向
 *
 * @example
 * ```tsx
 * <Menu orientation="horizontal">
 *   <MenuItem value="file">
 *     <MenuTrigger>文件</MenuTrigger>
 *     <MenuContent>
 *       <MenuAction>新建</MenuAction>
 *       <MenuAction>打开</MenuAction>
 *     </MenuContent>
 *   </MenuItem>
 * </Menu>
 * ```
 */
export function Menu({
  children,
  className = "",
  orientation = "horizontal",
  defaultValue,
  onValueChange,
}: MenuProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(
    defaultValue || null,
  );

  const handleSetOpenMenuId = useCallback(
    (id: string | null) => {
      setOpenMenuId(id);
      onValueChange?.(id);
    },
    [onValueChange],
  );

  const value = useMemo<MenuContextValue>(
    () => ({
      openMenuId,
      setOpenMenuId: handleSetOpenMenuId,
      orientation,
    }),
    [openMenuId, handleSetOpenMenuId, orientation],
  );

  return (
    <MenuContext.Provider value={value}>
      <nav
        className={`
          flex
          ${orientation === "horizontal" ? "flex-row items-center gap-1" : "flex-col gap-0.5 h-full justify-center"}
          ${className}
        `}
      >
        {children}
      </nav>
    </MenuContext.Provider>
  );
}

// ============================================
// MenuItem
// ============================================

interface MenuItemContextValue {
  menuId: string;
  isOpen: boolean;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;
}

const MenuItemContext = createContext<MenuItemContextValue | null>(null);

function useMenuItemContext(component: string): MenuItemContextValue {
  const context = useContext(MenuItemContext);
  if (!context) {
    throw new Error(`${component} 必须在 <MenuItem> 组件内使用`);
  }
  return context;
}

export interface MenuItemProps {
  children: ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

/**
 * MenuItem 单个菜单项容器
 *
 * 管理单个菜单的打开/关闭状态
 */
export function MenuItem({
  children,
  value,
  className = "",
  disabled = false,
}: MenuItemProps) {
  const menuContext = useMenuContext("MenuItem");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isOpen = menuContext.openMenuId === value && !disabled;

  const openMenu = useCallback(() => {
    if (!disabled) {
      menuContext.setOpenMenuId(value);
    }
  }, [disabled, menuContext, value]);

  const closeMenu = useCallback(() => {
    if (menuContext.openMenuId === value) {
      menuContext.setOpenMenuId(null);
    }
  }, [menuContext, value]);

  const toggleMenu = useCallback(() => {
    if (disabled) return;
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [disabled, isOpen, closeMenu, openMenu]);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, closeMenu]);

  // ESC 键关闭菜单
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeMenu]);

  const itemValue = useMemo<MenuItemContextValue>(
    () => ({
      menuId: value,
      isOpen,
      triggerRef,
      contentRef,
      openMenu,
      closeMenu,
      toggleMenu,
    }),
    [value, isOpen, openMenu, closeMenu, toggleMenu],
  );

  return (
    <MenuItemContext.Provider value={itemValue}>
      <div className={`relative ${disabled ? "opacity-50" : ""} ${className}`}>
        {children}
      </div>
    </MenuItemContext.Provider>
  );
}

// ============================================
// MenuTrigger
// ============================================

export interface MenuTriggerProps
  extends Omit<HTMLAttributes<HTMLButtonElement>, "type"> {
  children: ReactNode;
  className?: string;
  asChild?: boolean;
}

/**
 * MenuTrigger 菜单触发按钮
 *
 * 点击后显示/隐藏菜单内容
 */
export const MenuTrigger = forwardRef<HTMLButtonElement, MenuTriggerProps>(
  ({ children, className = "", asChild = false, ...props }, forwardedRef) => {
    const itemContext = useMenuItemContext("MenuTrigger");
    const menuContext = useMenuContext("MenuTrigger");

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        itemContext.toggleMenu();
      },
      [itemContext],
    );

    const handleMouseEnter = useCallback(() => {
      if (menuContext.orientation === "horizontal" && menuContext.openMenuId) {
        itemContext.openMenu();
      }
    }, [menuContext.orientation, menuContext.openMenuId, itemContext]);

    const setRef = useCallback(
      (node: HTMLButtonElement | null) => {
        itemContext.triggerRef.current = node;
        if (typeof forwardedRef === "function") {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      },
      [forwardedRef, itemContext.triggerRef],
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<
        React.HTMLAttributes<HTMLElement>
      >;

      // 合并 className
      const mergedClassName = [
        (child.props as React.HTMLAttributes<HTMLElement>).className,
        className,
      ]
        .filter(Boolean)
        .join(" ");

      const childProps = {
        ...child.props,
        ref: (node: HTMLButtonElement | null) => {
          setRef(node);
          // 处理子元素的原始 ref
          const childRef = (
            child as React.ReactElement & { ref?: React.Ref<HTMLButtonElement> }
          ).ref;
          if (typeof childRef === "function") {
            childRef(node);
          } else if (
            childRef &&
            typeof childRef === "object" &&
            "current" in childRef
          ) {
            (
              childRef as React.MutableRefObject<HTMLButtonElement | null>
            ).current = node;
          }
        },
        className: mergedClassName || undefined,
        onClick: (e: React.MouseEvent) => {
          handleClick(e);
          // 调用原始 onClick
          if (child.props.onClick) {
            (child.props.onClick as (e: React.MouseEvent) => void)(e);
          }
        },
        onMouseEnter: (e: React.MouseEvent) => {
          handleMouseEnter();
          // 调用原始 onMouseEnter
          if (child.props.onMouseEnter) {
            (child.props.onMouseEnter as (e: React.MouseEvent) => void)(e);
          }
        },
        "data-state": itemContext.isOpen ? "open" : "closed",
        "aria-expanded": itemContext.isOpen,
      };

      return React.cloneElement(child, childProps);
    }

    return (
      <button
        ref={setRef}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        data-state={itemContext.isOpen ? "open" : "closed"}
        aria-expanded={itemContext.isOpen}
        className={`
          px-4
          py-2
          text-md
          tracking-wider
          rounded-sm
          transition-colors
          hover:bg-foreground/10
          focus:outline-none
          focus-visible:ring-2
          focus-visible:ring-primary
          data-[state=open]:bg-foreground/10
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  },
);

MenuTrigger.displayName = "MenuTrigger";

// ============================================
// MenuContent
// ============================================

export interface MenuContentProps {
  children: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  alignOffset?: number;
  minWidth?: number;
}

/**
 * MenuContent 菜单内容容器
 *
 * 显示菜单项列表
 */
export function MenuContent({
  children,
  className = "",
  align = "start",
  sideOffset = 4,
  alignOffset = 0,
  minWidth = 180,
}: MenuContentProps) {
  const itemContext = useMenuItemContext("MenuContent");
  const menuContext = useMenuContext("MenuContent");
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [showAbove, setShowAbove] = useState(false);

  // 确保只在客户端挂载后才渲染 Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // 计算位置
  useEffect(() => {
    if (!itemContext.isOpen) {
      setPosition(null);
      setHasCalculated(false);
      setShowAbove(false);
      return;
    }

    const updatePosition = () => {
      const trigger = itemContext.triggerRef.current;
      const content = itemContext.contentRef.current;
      if (!trigger) {
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      // 获取菜单的实际高度
      const actualMenuHeight = content?.offsetHeight || 0;

      // 如果还没有实际高度，不要设置位置
      if (actualMenuHeight === 0) {
        return;
      }

      const menuHeight = actualMenuHeight;

      // 判断应该在上方还是下方显示
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const shouldShowAbove =
        spaceBelow < menuHeight && spaceAbove > spaceBelow;

      // 更新显示方向状态
      setShowAbove(shouldShowAbove);

      if (menuContext.orientation === "horizontal") {
        // 水平菜单：根据空间决定显示在上方或下方
        if (shouldShowAbove) {
          // 菜单底部紧贴按钮顶部
          top = triggerRect.top - menuHeight - sideOffset;
        } else {
          // 菜单顶部紧贴按钮底部
          top = triggerRect.bottom + sideOffset;
        }

        switch (align) {
          case "start":
            left = triggerRect.left + alignOffset;
            break;
          case "center":
            left =
              triggerRect.left +
              triggerRect.width / 2 -
              minWidth / 2 +
              alignOffset;
            break;
          case "end":
            left = triggerRect.right - minWidth + alignOffset;
            break;
        }
      } else {
        // 垂直菜单：根据空间决定显示在上方或下方
        if (shouldShowAbove) {
          // 菜单底部紧贴按钮顶部
          top = triggerRect.top - menuHeight - sideOffset;
        } else {
          // 菜单顶部紧贴按钮底部
          top = triggerRect.bottom + sideOffset;
        }

        switch (align) {
          case "start":
            left = triggerRect.left + alignOffset;
            break;
          case "center":
            left =
              triggerRect.left +
              triggerRect.width / 2 -
              minWidth / 2 +
              alignOffset;
            break;
          case "end":
            left = triggerRect.right - minWidth + alignOffset;
            break;
        }
      }

      // 边界检测：确保菜单不会超出屏幕

      // 检测右边界
      if (left + minWidth > viewportWidth) {
        left = viewportWidth - minWidth - 8; // 8px 边距
      }

      // 检测左边界
      if (left < 8) {
        left = 8; // 8px 边距
      }

      // 检测上边界
      if (top < 8) {
        top = 8;
      }

      // 检测下边界
      if (top + menuHeight > viewportHeight) {
        top = viewportHeight - menuHeight - 8;
      }

      setPosition({ top, left });
      setHasCalculated(true);
    };

    // 初次计算
    updatePosition();

    // 监听菜单内容的大小变化
    let resizeObserver: ResizeObserver | null = null;

    // 使用延迟来确保 DOM 已经渲染
    const timeoutId = setTimeout(() => {
      const content = itemContext.contentRef.current;
      if (content) {
        resizeObserver = new ResizeObserver(() => {
          updatePosition();
        });
        resizeObserver.observe(content);
        // 立即计算一次
        updatePosition();
      }
    }, 0);

    // 额外使用多个 RAF 确保能获取到正确的尺寸
    const rafId1 = requestAnimationFrame(() => {
      updatePosition();
    });

    const rafId2 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        updatePosition();
      });
    });

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver?.disconnect();
      cancelAnimationFrame(rafId1);
      cancelAnimationFrame(rafId2);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [
    itemContext.isOpen,
    itemContext.triggerRef,
    itemContext.contentRef,
    menuContext.orientation,
    align,
    sideOffset,
    alignOffset,
    minWidth,
  ]);

  if (!mounted) return null;

  // 根据显示方向调整动画
  const animationY = showAbove ? 4 : -4;

  const content = (
    <AnimatePresence>
      {itemContext.isOpen && (
        <motion.div
          ref={itemContext.contentRef}
          initial={{ opacity: 0, scale: 0.98, y: animationY }}
          animate={{
            opacity: hasCalculated ? 1 : 0,
            scale: hasCalculated ? 1 : 0.98,
            y: hasCalculated ? 0 : animationY,
          }}
          exit={{ opacity: 0, scale: 0.98, y: animationY }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            minWidth: `${minWidth / 16}em`,
            maxWidth: `${minWidth / 16}em`,
            maxHeight: "400px",
            overflowX: "hidden",
            overflowY: "auto",
            visibility: hasCalculated ? "visible" : "hidden",
          }}
          className={`
            z-50
            rounded-sm
            bg-background
            border
            border-border
            py-1
            ${className}
          `}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}

// ============================================
// MenuAction
// ============================================

export interface MenuActionProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  shortcut?: string;
}

/**
 * MenuAction 菜单操作项
 *
 * 可点击的菜单选项
 */
export function MenuAction({
  children,
  className = "",
  onClick,
  disabled = false,
  icon,
  shortcut,
}: MenuActionProps) {
  const itemContext = useMenuItemContext("MenuAction");

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    itemContext.closeMenu();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full
        flex
        items-center
        justify-between
        gap-3
        px-3
        py-2
        text-left
        text-sm
        transition-colors
        duration-100
        hover:bg-foreground/5
        focus:outline-none
        focus-visible:bg-foreground/5
        active:bg-foreground/10
        disabled:opacity-50
        disabled:cursor-not-allowed
        disabled:hover:bg-transparent
        ${className}
      `}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {icon && (
          <span className="flex items-center justify-center flex-shrink-0 w-4 h-4 text-foreground/60">
            {icon}
          </span>
        )}
        <span className="truncate">{children}</span>
      </div>
      {shortcut && (
        <span className="text-xs text-muted-foreground tracking-wider font-mono flex-shrink-0">
          {shortcut}
        </span>
      )}
    </button>
  );
}

// ============================================
// MenuCheckboxItem
// ============================================

export interface MenuCheckboxItemProps {
  children: ReactNode;
  className?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * MenuCheckboxItem 菜单复选框项
 *
 * 带有选中状态的菜单选项
 */
export function MenuCheckboxItem({
  children,
  className = "",
  checked = false,
  onCheckedChange,
  disabled = false,
}: MenuCheckboxItemProps) {
  const handleClick = () => {
    if (disabled) return;
    onCheckedChange?.(!checked);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      role="menuitemcheckbox"
      aria-checked={checked}
      className={`
        w-full
        flex
        items-center
        gap-2
        px-3
        py-2
        text-left
        text-md
        transition-colors
        hover:bg-foreground/10
        focus:outline-none
        focus-visible:bg-foreground/10
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${className}
      `}
    >
      <span className="w-4 h-4 flex items-center justify-center">
        {checked && <RiCheckLine size={16} />}
      </span>
      <span>{children}</span>
    </button>
  );
}

// ============================================
// MenuSeparator
// ============================================

export interface MenuSeparatorProps {
  className?: string;
}

/**
 * MenuSeparator 菜单分割线
 *
 * 用于在菜单项之间添加视觉分隔
 */
export function MenuSeparator({ className = "" }: MenuSeparatorProps) {
  return (
    <div role="separator" className={`my-1 h-px bg-border ${className}`} />
  );
}

// ============================================
// MenuLabel
// ============================================

export interface MenuLabelProps {
  children: ReactNode;
  className?: string;
}

/**
 * MenuLabel 菜单标签
 *
 * 用于对菜单项进行分组标注
 */
export function MenuLabel({ children, className = "" }: MenuLabelProps) {
  return (
    <div
      className={`
        px-3
        pt-2
        pb-1
        text-xs
        font-medium
        text-muted-foreground
        tracking-wide
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ============================================
// MenuSub (嵌套子菜单)
// ============================================

interface MenuSubContextValue {
  isOpen: boolean;
  openSub: () => void;
  closeSub: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const MenuSubContext = createContext<MenuSubContextValue | null>(null);

function useMenuSubContext(component: string): MenuSubContextValue {
  const context = useContext(MenuSubContext);
  if (!context) {
    throw new Error(`${component} 必须在 <MenuSub> 组件内使用`);
  }
  return context;
}

export interface MenuSubProps {
  children: ReactNode;
}

/**
 * MenuSub 嵌套子菜单容器
 *
 * 用于创建多级菜单
 */
export function MenuSub({ children }: MenuSubProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const openSub = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setIsOpen(true);
  }, []);

  const closeSub = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, []);

  // 点击外部关闭子菜单
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        contentRef.current &&
        !contentRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const value = useMemo<MenuSubContextValue>(
    () => ({
      isOpen,
      openSub,
      closeSub,
      triggerRef,
      contentRef,
    }),
    [isOpen, openSub, closeSub],
  );

  return (
    <MenuSubContext.Provider value={value}>{children}</MenuSubContext.Provider>
  );
}

// ============================================
// MenuSubTrigger
// ============================================

export interface MenuSubTriggerProps {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

/**
 * MenuSubTrigger 子菜单触发器
 *
 * 触发显示嵌套的子菜单
 */
export function MenuSubTrigger({
  children,
  className = "",
  icon,
  disabled = false,
}: MenuSubTriggerProps) {
  const subContext = useMenuSubContext("MenuSubTrigger");

  return (
    <div
      ref={subContext.triggerRef}
      onMouseEnter={disabled ? undefined : subContext.openSub}
      onMouseLeave={disabled ? undefined : subContext.closeSub}
      className={`
        relative
        w-full
        flex
        items-center
        justify-between
        gap-2
        px-3
        py-2
        text-md
        transition-colors
        hover:bg-foreground/10
        cursor-pointer
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="flex-shrink-0 w-4 h-4">{icon}</span>}
        <span>{children}</span>
      </div>
      <RiArrowRightSLine size={16} className="flex-shrink-0" />
    </div>
  );
}

// ============================================
// MenuSubContent
// ============================================

export interface MenuSubContentProps {
  children: ReactNode;
  className?: string;
  minWidth?: number;
}

/**
 * MenuSubContent 子菜单内容
 *
 * 显示嵌套子菜单的内容
 */
export function MenuSubContent({
  children,
  className = "",
  minWidth = 180,
}: MenuSubContentProps) {
  const subContext = useMenuSubContext("MenuSubContent");
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  // 确保只在客户端挂载后才渲染 Portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!subContext.isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = subContext.triggerRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      const top = triggerRect.top;
      const left = triggerRect.right + 4;

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [subContext.isOpen, subContext.triggerRef]);

  if (!mounted) return null;

  const content = (
    <AnimatePresence>
      {subContext.isOpen && position && (
        <motion.div
          ref={subContext.contentRef}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          onMouseEnter={subContext.openSub}
          onMouseLeave={subContext.closeSub}
          style={{
            position: "fixed",
            top: position.top,
            left: position.left,
            minWidth: `${minWidth}px`,
          }}
          className={`
            z-50
            bg-background
            border
            border-foreground/10
            rounded-sm
            shadow-2xl
            backdrop-blur-xl
            py-1
            ${className}
          `}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
