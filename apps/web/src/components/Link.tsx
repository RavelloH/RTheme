"use client";

import { useBroadcastSender } from "@/hooks/useBroadcast";
import { useMenu } from "@/components/MenuProvider";
import { default as NextLink } from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import React from "react";
import type { MenuItem } from "@/lib/server/menuCache";

interface CustomLinkProps extends React.ComponentProps<typeof NextLink> {
  children: React.ReactNode;
  presets?: string[];
}

// 处理特殊链接类型
function handleSpecialLinks(newPath: string): boolean {
  if (newPath.startsWith("#")) {
    const anchor = document.querySelector(newPath);
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth" });
    }
    return true;
  }

  if (newPath.startsWith("http")) {
    window.open(newPath, "_blank");
    return true;
  }

  if (newPath.startsWith("mailto:")) {
    window.location.href = newPath;
    return true;
  }

  return false;
}

// 预设样式映射
const presetStyles = {
  "hover-underline": {
    className: "group relative inline-block",
  },
  "hover-color": {
    className: "transition-colors duration-300",
  },
};

// 应用预设样式
function applyPresets(presets: string[] = [], children: React.ReactNode) {
  if (presets.length === 0) return children;

  const className = presets
    .map(
      (preset) => presetStyles[preset as keyof typeof presetStyles]?.className,
    )
    .filter(Boolean)
    .join(" ");

  // 处理 hover-underline 预设
  if (presets.includes("hover-underline")) {
    return (
      <span className={className}>
        <span className="relative inline-block">
          {children}
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out"></span>
        </span>
      </span>
    );
  }

  // 其他预设直接包装
  if (className) {
    return <span className={className}>{children}</span>;
  }

  return children;
}

// 规范化路径
function normalizePath(oldPath: string, newPath: string): string {
  if (!newPath.startsWith("/")) {
    return oldPath.endsWith("/") ? oldPath + newPath : oldPath + "/" + newPath;
  }
  return newPath;
}

// 执行导航过渡和跳转
function executeNavigationWithTransition(
  newPath: string,
  router: ReturnType<typeof useRouter>,
  broadcast: ReturnType<typeof useBroadcastSender<object>>["broadcast"],
  direction?: string,
) {
  // 如果有方向，广播过渡消息
  if (direction) {
    broadcast({
      type: "page-transition",
      direction,
    });
  }

  // 预取目标页面
  router.prefetch(newPath);

  // 延迟 500ms 后执行跳转，让动画有时间播放
  setTimeout(() => {
    router.push(newPath);
  }, 500);
}

// 判断水平方向导航
function handleHorizontalNavigation(
  oldPath: string,
  newPath: string,
  router: ReturnType<typeof useRouter>,
  broadcast: ReturnType<typeof useBroadcastSender<object>>["broadcast"],
  getLeftRightMenus: (currentPath: string) => {
    leftMenus: MenuItem[];
    rightMenus: MenuItem[];
    hasHomeOnLeft: boolean;
    isMainMenu: boolean;
    menuCategory: string;
    categoryIndex: number;
  },
) {
  const oldMenuInfo = getLeftRightMenus(oldPath);
  const newMenuInfo = getLeftRightMenus(newPath);

  const {
    leftMenus,
    rightMenus,
    hasHomeOnLeft,
    isMainMenu: oldIsMainMenu,
    menuCategory: oldMenuCategory,
  } = oldMenuInfo;

  const { isMainMenu: newIsMainMenu, menuCategory: newMenuCategory } =
    newMenuInfo;

  const targetSlug = newPath.replace(/^\//, "");
  const isLeft = leftMenus.some((menu) => menu.slug === targetSlug);
  const isRight = rightMenus.some((menu) => menu.slug === targetSlug);
  const isHome = targetSlug === "" || newPath === "/";

  // MAIN 菜单与其他菜单之间的导航
  if (oldIsMainMenu !== newIsMainMenu) {
    const direction = oldIsMainMenu ? "right" : "left";
    executeNavigationWithTransition(newPath, router, broadcast, direction);
    return;
  }

  // 同类别菜单内的导航
  if (oldMenuCategory === newMenuCategory && oldMenuCategory !== "UNKNOWN") {
    let direction: "left" | "right" | "unknown" = "unknown";

    if (isLeft || (isHome && hasHomeOnLeft)) {
      direction = "left";
    } else if (isRight) {
      direction = "right";
    }

    executeNavigationWithTransition(newPath, router, broadcast, direction);
    return;
  }

  // 其他情况
  executeNavigationWithTransition(newPath, router, broadcast, "unknown");
}

function jumpTransition(
  oldPath: string,
  newPath: string,
  router: ReturnType<typeof useRouter>,
  broadcast: ReturnType<typeof useBroadcastSender<object>>["broadcast"],
  getLeftRightMenus: (currentPath: string) => {
    leftMenus: MenuItem[];
    rightMenus: MenuItem[];
    hasHomeOnLeft: boolean;
    isMainMenu: boolean;
    menuCategory: string;
    categoryIndex: number;
  },
) {
  const cleanedPath = newPath.startsWith("http")
    ? newPath.replace(/([^:])\/+/g, "$1/")
    : newPath.replace(/\/+/g, "/");
  // 处理特殊链接
  if (handleSpecialLinks(cleanedPath)) {
    return;
  }

  // 规范化路径
  const normalizedPath = normalizePath(oldPath, cleanedPath);

  // 同一路径，静默刷新
  if (oldPath === normalizedPath) {
    router.refresh();
    return;
  }

  // 处理垂直导航
  const oldDepth = oldPath.split("/").length;
  const newDepth = normalizedPath.split("/").length;

  if (oldDepth > newDepth) {
    executeNavigationWithTransition(normalizedPath, router, broadcast, "up");
    return;
  } else if (oldDepth < newDepth) {
    executeNavigationWithTransition(normalizedPath, router, broadcast, "down");
    return;
  }

  // 处理水平导航（仅在同级时）
  if (oldDepth === newDepth) {
    handleHorizontalNavigation(
      oldPath,
      normalizedPath,
      router,
      broadcast,
      getLeftRightMenus,
    );
  }
}

export default function Link({ children, presets, ...props }: CustomLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { broadcast } = useBroadcastSender<object>();
  const { getLeftRightMenus } = useMenu();

  const handleNavigation = (e: { preventDefault: () => void }) => {
    jumpTransition(
      pathname,
      props.href.toString(),
      router,
      broadcast,
      getLeftRightMenus,
    );
    e.preventDefault();
  };

  // 应用预设样式
  const styledChildren = applyPresets(presets, children);

  // 合并 className
  const combinedClassName = [
    props.className,
    presets?.includes("hover-underline") ? "group" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <NextLink
      {...props}
      className={combinedClassName}
      onNavigate={handleNavigation}
    >
      {styledChildren}
    </NextLink>
  );
}
