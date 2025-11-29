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
          ${orientation === "horizontal" ? "flex-row items-center gap-1" : "flex-col gap-0.5"}
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

    const handleClick = () => {
      itemContext.toggleMenu();
    };

    const handleMouseEnter = () => {
      if (menuContext.orientation === "horizontal" && menuContext.openMenuId) {
        itemContext.openMenu();
      }
    };

    const mergedRef = useCallback(
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
      return React.cloneElement(children, {
        ref: mergedRef,
        onClick: handleClick,
        onMouseEnter: handleMouseEnter,
        "data-state": itemContext.isOpen ? "open" : "closed",
        "aria-expanded": itemContext.isOpen,
        ...props,
      } as React.HTMLAttributes<HTMLElement>);
    }

    return (
      <button
        ref={mergedRef}
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

  // 计算位置
  useEffect(() => {
    if (!itemContext.isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = itemContext.triggerRef.current;
      if (!trigger) return;

      const triggerRect = trigger.getBoundingClientRect();
      let top = 0;
      let left = 0;

      if (menuContext.orientation === "horizontal") {
        // 水平菜单：内容显示在下方
        top = triggerRect.bottom + sideOffset;

        switch (align) {
          case "start":
            left = triggerRect.left + alignOffset;
            break;
          case "center":
            left = triggerRect.left + triggerRect.width / 2 + alignOffset;
            break;
          case "end":
            left = triggerRect.right + alignOffset;
            break;
        }
      } else {
        // 垂直菜单：内容显示在右侧
        top = triggerRect.top + alignOffset;
        left = triggerRect.right + sideOffset;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [
    itemContext.isOpen,
    itemContext.triggerRef,
    menuContext.orientation,
    align,
    sideOffset,
    alignOffset,
  ]);

  return (
    <AnimatePresence>
      {itemContext.isOpen && position && (
        <motion.div
          ref={itemContext.contentRef}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: position.top,
            left:
              align === "center"
                ? position.left - minWidth / 2
                : align === "end"
                  ? position.left - minWidth
                  : position.left,
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
      <div className="flex items-center gap-2 flex-1">
        {icon && <span className="flex-shrink-0 w-4 h-4">{icon}</span>}
        <span>{children}</span>
      </div>
      {shortcut && (
        <span className="text-xs text-foreground/50 tracking-wider">
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
    <div
      role="separator"
      className={`my-1 h-px bg-foreground/10 ${className}`}
    />
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
        py-1.5
        text-xs
        font-medium
        text-foreground/50
        tracking-widest
        uppercase
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

  return (
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
}
