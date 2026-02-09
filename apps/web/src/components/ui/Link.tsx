"use client";

import React, { useEffect, useState } from "react";
import {
  RiArrowRightDoubleLine,
  RiArrowRightUpLongLine,
} from "@remixicon/react";
import { default as NextLink } from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";

import { useMenu } from "@/components/client/layout/MenuProvider";
import type { DynamicIcon as DynamicIconType } from "@/components/ui/DynamicIcon";
import { useBroadcastSender } from "@/hooks/use-broadcast";

const HISTORY_STACK_KEY = "neutral-press-history-stack";

type BroadcastFn = ReturnType<typeof useBroadcastSender<object>>["broadcast"];
type GetLeftRightMenusFn = ReturnType<typeof useMenu>["getLeftRightMenus"];
type RouterInstance = ReturnType<typeof useRouter>;

interface CustomLinkProps extends React.ComponentProps<typeof NextLink> {
  children: React.ReactNode;
  presets?: Array<
    | "hover-underline"
    | "arrow"
    | "arrow-out"
    | "hash"
    | "dynamic-icon"
    | "hover-color"
    | ""
  >;
}

// 处理特殊链接类型
function handleSpecialLinks(newPath: string): boolean {
  if (newPath.startsWith("#")) {
    const anchorId = newPath.slice(1);
    const anchor = document.getElementById(anchorId);

    if (anchor) {
      // 更新URL地址栏（添加hash）
      window.history.pushState(null, "", newPath);
      // 平滑滚动到锚点位置
      anchor.scrollIntoView({ behavior: "smooth" });
    } else {
      // 即使找不到锚点元素，也要更新URL
      window.history.pushState(null, "", newPath);
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
    className: "transition-colors duration-300 ease-in-out hover:text-primary",
  },
  arrow: {
    className: "inline-flex items-center gap-1",
  },
  "arrow-out": {
    className: "inline-flex items-center gap-1",
  },
  hash: {
    className: "",
  },
  "dynamic-icon": {
    className: "inline-flex items-center gap-1",
  },
};

function isPlainTextChildren(children: React.ReactNode): boolean {
  const childArray = React.Children.toArray(children);
  if (childArray.length === 0) return false;

  return childArray.every(
    (child) => typeof child === "string" || typeof child === "number",
  );
}

// 应用预设样式
function applyPresets(
  presets: string[] = [],
  children: React.ReactNode,
  href?: string,
  DynamicIconComponent?: React.ComponentType<{
    url: string;
    size: string;
    className: string;
  }> | null,
) {
  if (presets.length === 0) return children;
  const shouldShowIndicators = isPlainTextChildren(children);

  // 获取除了特殊预设外的其他预设的 className
  const otherPresets = presets.filter(
    (p) =>
      ![
        "hover-underline",
        "arrow",
        "arrow-out",
        "hash",
        "dynamic-icon",
      ].includes(p),
  );
  const className = otherPresets
    .map(
      (preset) => presetStyles[preset as keyof typeof presetStyles]?.className,
    )
    .filter(Boolean)
    .join(" ");

  let content = children;

  // 处理 hash 预设
  if (presets.includes("hash")) {
    // 检查 children 是否是字符串且已经包含 #
    const childrenText = typeof children === "string" ? children : "";
    const hasHash = childrenText.startsWith("#");

    if (!hasHash) {
      content = (
        <>
          <span className="text-current opacity-70 mr-1">#</span>
          {content}
        </>
      );
    }
  }

  // 处理 arrow 预设（只在行内显示）
  if (shouldShowIndicators && presets.includes("arrow")) {
    content = (
      <>
        {content}
        <RiArrowRightDoubleLine size={"1em"} className="inline-block ml-1" />
      </>
    );
  }

  // 处理 arrow-out 预设（只在行内显示）
  if (shouldShowIndicators && presets.includes("arrow-out")) {
    content = (
      <>
        {content}
        <RiArrowRightUpLongLine size={"1em"} className="inline-block ml-1" />
      </>
    );
  }

  // 处理 hover-underline 预设
  if (presets.includes("hover-underline")) {
    // 如果同时有动态图标，图标应该在下划线外面
    if (
      shouldShowIndicators &&
      presets.includes("dynamic-icon") &&
      DynamicIconComponent &&
      href
    ) {
      return (
        <span className={className}>
          <DynamicIconComponent
            url={href}
            size={"1em"}
            className="inline-block mr-1"
          />
          <span className="relative inline box-decoration-clone bg-[linear-gradient(currentColor,currentColor)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]">
            {content}
          </span>
        </span>
      );
    }

    return (
      <span className={className}>
        <span className="relative inline box-decoration-clone bg-[linear-gradient(currentColor,currentColor)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]">
          {content}
        </span>
      </span>
    );
  }

  // 处理动态图标预设（只在没有 hover-underline 时才在这里处理）
  if (
    shouldShowIndicators &&
    presets.includes("dynamic-icon") &&
    DynamicIconComponent &&
    href
  ) {
    content = (
      <>
        <DynamicIconComponent
          url={href}
          size={"1em"}
          className="inline-block mr-1"
        />
        {content}
      </>
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

// 不使用过渡效果的路径列表
const NO_TRANSITION_PATHS = [
  "/user",
  "/notifications",
  "/messages",
  "/gallery/photo/",
  "/projects/",
  "/friends/new",
];

// 检查路径是否应该跳过过渡效果
function shouldSkipTransition(path: string): boolean {
  return NO_TRANSITION_PATHS.some((prefix) => path.startsWith(prefix));
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

// 提取路径末尾的数字
function extractTrailingNumber(path: string): number | null {
  const segments = path.split("/").filter((segment) => segment !== "");
  if (segments.length === 0) return null;

  const lastSegment = segments[segments.length - 1];
  const numberMatch = lastSegment?.match(/^(\d+)$/);

  return numberMatch ? parseInt(numberMatch[1] || "0", 10) : null;
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

  // 新增：检查路径末尾数字比较
  const oldNumber = extractTrailingNumber(oldPath);
  const newNumber = extractTrailingNumber(newPath);

  if (oldNumber !== null && newNumber !== null) {
    // 如果两个路径的末尾都是数字，比较它们的大小
    const oldPathWithoutNumber = oldPath.replace(/\/\d+$/, "");
    const newPathWithoutNumber = newPath.replace(/\/\d+$/, "");

    // 确保是同一路径的不同页码
    if (oldPathWithoutNumber === newPathWithoutNumber) {
      let direction: "up" | "down" | "unknown";

      if (newNumber > oldNumber) {
        direction = "down"; // 数字增大，向上滑动
      } else if (newNumber < oldNumber) {
        direction = "up"; // 数字减小，向下滑动
      } else {
        direction = "unknown"; // 数字相同
      }

      executeNavigationWithTransition(newPath, router, broadcast, direction);
      return;
    }
  }

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
  isBack: boolean = false,
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

  // 检查是否应该跳过过渡效果
  if (shouldSkipTransition(normalizedPath)) {
    router.push(normalizedPath);
    return;
  }

  // 如果不是返回操作，则记录当前路径到历史栈
  if (!isBack && typeof sessionStorage !== "undefined") {
    try {
      const stack = JSON.parse(
        sessionStorage.getItem(HISTORY_STACK_KEY) || "[]",
      );
      // 避免重复连续入栈（虽然业务逻辑上可能允许 A->B->A，但防止快速点击导致重复记录）
      // 这里我们只记录有效的跳转
      stack.push(oldPath);
      // 限制栈大小，防止无限增长
      if (stack.length > 50) stack.shift();
      sessionStorage.setItem(HISTORY_STACK_KEY, JSON.stringify(stack));
    } catch (e) {
      console.error("Failed to save history stack", e);
    }
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
 * @returns A function that takes the target path and optional options
 * @example
 * const navigate = useNavigateWithTransition();
 * navigate('/about'); // Navigate to /about with transition
 */
export function useNavigateWithTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const { broadcast } = useBroadcastSender<object>();
  const { getLeftRightMenus } = useMenu();

  return (targetPath: string, options?: { isBack?: boolean }) => {
    jumpTransition(
      pathname,
      targetPath,
      router,
      broadcast,
      getLeftRightMenus,
      options?.isBack,
    );
  };
}

/**
 * Hook to navigate back to the previous page in the internal history stack
 */
export function useBackNavigation() {
  const navigate = useNavigateWithTransition();

  const back = () => {
    if (typeof window === "undefined") return;
    try {
      const stack = JSON.parse(
        sessionStorage.getItem(HISTORY_STACK_KEY) || "[]",
      );
      const prev = stack.pop();

      if (prev) {
        // 更新栈
        sessionStorage.setItem(HISTORY_STACK_KEY, JSON.stringify(stack));
        // 执行返回导航，标记 isBack 为 true 以防止将当前页再次压入栈（避免死循环）
        navigate(prev, { isBack: true });
      } else {
        // 如果栈为空，回退到首页
        navigate("/", { isBack: true });
      }
    } catch (e) {
      console.error("Failed to perform back navigation", e);
      navigate("/", { isBack: true });
    }
  };

  return back;
}

export default React.forwardRef<HTMLAnchorElement, CustomLinkProps>(
  function Link({ children, presets, ...props }, ref) {
    const navigate = useNavigateWithTransition();

    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>) => {
      const targetPath = props.href.toString();
      navigate(targetPath);
      e.preventDefault();
      if (props.onClick) {
        props.onClick(e);
      }
    };

    // 检查是否需要动态图标
    const needsDynamicIcon = presets?.includes("dynamic-icon");

    // 合并 className
    const combinedClassName = [
      props.className,
      presets?.includes("hover-underline") ? "group" : "",
    ]
      .filter(Boolean)
      .join(" ");

    // 如果需要动态图标，使用客户端组件
    if (needsDynamicIcon) {
      return (
        <DynamicIconLink
          {...props}
          presets={presets}
          className={combinedClassName}
          onClick={handleNavigation}
          linkRef={ref}
        >
          {children}
        </DynamicIconLink>
      );
    }

    // 应用预设样式（不带动态图标）
    const styledChildren = applyPresets(presets, children);

    return (
      <NextLink
        {...props}
        className={combinedClassName}
        onClick={handleNavigation}
        ref={ref}
      >
        {styledChildren}
      </NextLink>
    );
  },
);

// 动态图标链接客户端组件
function DynamicIconLink({
  children,
  presets,
  onClick,
  linkRef,
  ...props
}: CustomLinkProps & {
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  linkRef?: React.Ref<HTMLAnchorElement>;
}) {
  const [DynamicIcon, setDynamicIcon] = useState<typeof DynamicIconType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 动态导入 DynamicIcon 组件
    import("./DynamicIcon")
      .then((module) => {
        if (isMounted) {
          setDynamicIcon(() => module.DynamicIcon);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load DynamicIcon:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const href = props.href?.toString() || "";

  // 应用预设样式（带动态图标）
  const styledChildren = applyPresets(
    presets,
    children,
    href,
    loading ? null : DynamicIcon,
  );

  return (
    <NextLink
      {...props}
      onClick={onClick}
      ref={linkRef as React.RefObject<HTMLAnchorElement>}
    >
      {styledChildren}
    </NextLink>
  );
}
