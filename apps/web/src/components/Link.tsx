"use client";

import { useBroadcastSender } from "@/hooks/useBroadcast";
import { useMenu } from "@/components/MenuProvider";
import { default as NextLink } from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import {
  RiArrowRightDoubleLine,
  RiArrowRightUpLongLine,
} from "@remixicon/react";
import React from "react";

type BroadcastFn = ReturnType<typeof useBroadcastSender<object>>["broadcast"];
type GetLeftRightMenusFn = ReturnType<typeof useMenu>["getLeftRightMenus"];
type RouterInstance = ReturnType<typeof useRouter>;

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

  // 检查是否是外部链接（非当前域名）
  if (newPath.startsWith("http")) {
    try {
      const url = new URL(newPath);
      const currentHost = window.location.host;

      // 如果是外部链接，在新标签页打开
      if (url.host !== currentHost) {
        window.open(newPath, "_blank");
        return true;
      }

      // 如果是当前域名的完整URL，返回false让后续逻辑处理
      return false;
    } catch {
      // URL解析失败，按外部链接处理
      window.open(newPath, "_blank");
      return true;
    }
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
  arrow: {
    className: "inline-flex items-center gap-1",
  },
  "arrow-out": {
    className: "inline-flex items-center gap-1",
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

  let content = children;

  // 处理 arrow 预设
  if (presets.includes("arrow")) {
    content = (
      <span className="inline-flex items-center gap-1">
        {content}
        <RiArrowRightDoubleLine size={"1em"} />
      </span>
    );
  }

  // 处理 arrow-out 预设
  if (presets.includes("arrow-out")) {
    content = (
      <span className="inline-flex items-center gap-1">
        {content}
        <RiArrowRightUpLongLine size={"1em"} />
      </span>
    );
  }

  // 处理 hover-underline 预设
  if (presets.includes("hover-underline")) {
    return (
      <span className={className}>
        <span className="relative inline-block">
          {content}
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out"></span>
        </span>
      </span>
    );
  }

  // 其他预设直接包装
  if (className) {
    return <span className={className}>{content}</span>;
  }

  return content;
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
  router: RouterInstance,
  broadcast: BroadcastFn,
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
  router: RouterInstance,
  broadcast: BroadcastFn,
  getLeftRightMenus: GetLeftRightMenusFn,
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

export function jumpTransition(
  oldPath: string,
  newPath: string,
  router: RouterInstance,
  broadcast: BroadcastFn,
  getLeftRightMenus: GetLeftRightMenusFn,
) {
  let cleanedPath = newPath;

  // 如果是完整URL且是当前域名，提取路径部分
  if (newPath.startsWith("http")) {
    try {
      const url = new URL(newPath);
      const currentHost = window.location.host;

      if (url.host === currentHost) {
        // 提取路径、search和hash部分
        cleanedPath = url.pathname + url.search + url.hash;
      } else {
        // 保持原样，让 handleSpecialLinks 处理
        cleanedPath = newPath;
      }
    } catch {
      // URL解析失败，保持原样
      cleanedPath = newPath;
    }
  }

  // 清理多余的斜杠
  cleanedPath = cleanedPath.startsWith("http")
    ? cleanedPath.replace(/([^:])\/+/g, "$1/")
    : cleanedPath.replace(/\/+/g, "/");

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

/**
 * Hook to get a navigation function with transition effects
 * @returns A function that takes only the target path and handles navigation with transitions
 * @example
 * const navigate = useNavigateWithTransition();
 * navigate('/about'); // Navigate to /about with transition
 */
export function useNavigateWithTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const { broadcast } = useBroadcastSender<object>();
  const { getLeftRightMenus } = useMenu();

  return (targetPath: string) => {
    jumpTransition(pathname, targetPath, router, broadcast, getLeftRightMenus);
  };
}

export default function Link({ children, presets, ...props }: CustomLinkProps) {
  const navigate = useNavigateWithTransition();

  const handleNavigation = (e: { preventDefault: () => void }) => {
    const targetPath = props.href.toString();
    navigate(targetPath);
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
