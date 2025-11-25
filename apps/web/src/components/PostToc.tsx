"use client";

import React, { useState, useEffect, useRef } from "react";
import { RiListCheck } from "@remixicon/react";
import Link from "./Link";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface PostTocProps {
  content: string;
  isMobile?: boolean;
}

export default function PostToc({ content, isMobile = false }: PostTocProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null); // 包裹容器
  const tocRef = useRef<HTMLDivElement>(null); // 目录元素
  const [isFixed, setIsFixed] = useState(false);
  const [tocDimensions, setTocDimensions] = useState({
    height: 0,
    left: 0,
    width: 0,
    top: 0,
  });

  // 将 em 单位转换为像素值
  const emToPx = (em: number): number => {
    if (typeof window === "undefined") return em * 16; // SSR 时使用默认值
    const fontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    return em * fontSize;
  };

  // 提取目录
  useEffect(() => {
    const items: TocItem[] = [];

    // 创建一个临时的 DOM 元素来解析内容
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // 查找所有标题元素
    const headings = tempDiv.querySelectorAll("h1, h2, h3, h4, h5, h6");

    // 生成与 MDXRenderer 中相同的 ID 格式（数字后缀）
    let headingCounter = 0;
    const generateSlug = (text: string): string => {
      headingCounter++;
      const baseSlug = text
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      // 确保baseSlug不为空，如果为空使用 'heading'
      const safeBaseSlug = baseSlug || "heading";

      // 将数字放在后缀，避免CSS选择器以数字开头的问题
      return `${safeBaseSlug}-${headingCounter}`;
    };

    headings.forEach((heading, index) => {
      const text = heading.textContent || "";
      const level = parseInt(heading.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.

      const id = generateSlug(text);

      // 调试信息
      if (process.env.NODE_ENV === "development") {
        console.log("TOC Debug: 生成目录项", {
          index,
          text,
          level,
          id,
          tocItemCount: items.length + 1,
        });
      }

      items.push({ id, text, level });
    });

    setTocItems(items);
  }, [content]);

  // 处理页面加载时的hash
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      // 等待DOM完全渲染后再处理hash
      const timer = setTimeout(() => {
        const hash = window.location.hash;
        const anchor = document.querySelector(hash);
        if (anchor) {
          anchor.scrollIntoView({ behavior: "smooth" });
        }
      }, 100); // 给DOM渲染留出时间

      return () => clearTimeout(timer);
    }
  }, []); // 只在组件挂载时执行一次

  // 监听滚动，实现固定定位和更新活动标题
  useEffect(() => {
    if (isMobile) {
      return;
    }

    if (tocItems.length === 0) {
      return;
    }

    if (!tocRef.current || !containerRef.current) {
      return;
    }

    // 查找实际的滚动容器（找最外层的）
    const findScrollContainer = (element: HTMLElement): HTMLElement | null => {
      let parent = element.parentElement;
      let level = 0;
      let lastScrollContainer: HTMLElement | null = null; // 记录最后（最外层）找到的滚动容器

      while (parent) {
        level++;
        const overflow = window.getComputedStyle(parent).overflowY;

        if (overflow === "auto" || overflow === "scroll") {
          lastScrollContainer = parent; // 记录这个滚动容器，继续向上查找
        }

        parent = parent.parentElement;
        if (level > 20) {
          break;
        }
      }

      return lastScrollContainer;
    };

    const scrollContainer = findScrollContainer(containerRef.current);
    const scrollTarget: EventTarget = (scrollContainer ||
      window) as EventTarget;

    // 记录目录的尺寸和位置
    const updateDimensions = () => {
      if (tocRef.current && containerRef.current) {
        const tocRect = tocRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        const dimensions = {
          height: tocRect.height,
          left: containerRect.left,
          width: containerRect.width,
          top: Math.max(containerRect.top),
        };
        setTocDimensions(dimensions);
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    const handleScroll = () => {
      // 更新活动标题 - 使用 id 直接匹配，因为标题元素现在有了正确的 id
      const headings = document.querySelectorAll(
        "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]",
      );
      const activeThreshold = emToPx(16);

      let currentActiveId = "";

      // 调试信息
      if (process.env.NODE_ENV === "development") {
        console.log("TOC Debug: 查找目录项", {
          tocItemsCount: tocItems.length,
          headingsCount: headings.length,
          activeThreshold: activeThreshold,
        });
      }

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= activeThreshold) {
          currentActiveId = heading.id;

          if (process.env.NODE_ENV === "development") {
            console.log("TOC Debug: 找到匹配标题", {
              headingId: heading.id,
              headingText: heading.textContent,
              rectTop: rect.top,
              isActive: heading.id === currentActiveId,
            });
          }
        }
      });

      setActiveId(currentActiveId);

      // 处理固定定位
      if (!containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const fixedThreshold = emToPx(7.5); // 7.5em ≈ 120px (基于 16px 基准字体)
      const shouldBeFixed = rect.top <= fixedThreshold;

      setIsFixed((prevFixed) => {
        if (shouldBeFixed !== prevFixed) {
          // 在切换到固定状态的瞬间，记录目录的当前位置
          if (
            !prevFixed &&
            shouldBeFixed &&
            tocRef.current &&
            containerRef.current
          ) {
            const tocRect = tocRef.current.getBoundingClientRect();
            const containerRect = containerRef.current.getBoundingClientRect();
            const fixedTopOffset = emToPx(2.5); // 2.5em ≈ 40px (基于 16px 基准字体)
            setTocDimensions({
              height: tocRect.height,
              left: containerRect.left,
              width: containerRect.width,
              top: fixedTopOffset,
            });
          }
        }
        return shouldBeFixed;
      });
    };

    scrollTarget.addEventListener("scroll", handleScroll as EventListener, {
      passive: true,
    });

    handleScroll(); // 初始检查

    // 清理函数
    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll as EventListener);
      window.removeEventListener("resize", updateDimensions);
    };
  }, [isMobile, tocItems]); // 添加 tocItems 作为依赖，因为需要访问目录项数据

  // 点击目录项 - 基于文本内容查找目标标题元素
  const handleTocClick = (id: string) => {
    // 在目录项中找到对应的文本内容
    const targetItem = tocItems.find((item) => item.id === id);
    if (!targetItem) return;

    // 在页面中查找具有相同文本内容的标题元素
    const allHeadings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const targetHeading = Array.from(allHeadings).find(
      (heading) => heading.textContent === targetItem.text,
    );

    if (targetHeading) {
      const offset = 80; // 导航栏高度偏移，适当增加偏移避免被遮挡
      const elementPosition =
        targetHeading.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      // 滚动到目标位置
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // 开发环境调试信息
      if (process.env.NODE_ENV === "development") {
        console.log("TOC Debug: 点击跳转", {
          targetId: id,
          targetText: targetItem.text,
          offsetPosition,
          elementPosition,
        });
      }
    } else {
      // 开发环境警告信息
      if (process.env.NODE_ENV === "development") {
        console.warn("TOC Debug: 未找到目标标题元素", {
          targetId: id,
          targetText: targetItem.text,
        });
      }
    }
  };

  if (isMobile) {
    // 移动端悬浮按钮实现
    return (
      <div className="relative">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          title="目录"
        >
          <RiListCheck size="1.2em" />
        </button>

        {isCollapsed && tocItems.length > 0 && (
          <div className="absolute bottom-16 right-0 w-80 bg-background border border-border rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RiListCheck size="1.2em" />
                目录
              </h3>
            </div>

            <nav className="space-y-1">
              {tocItems.map((item) => {
                const isActive = activeId === item.id;
                const marginLeft = (item.level - 1) * 12;

                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={() => setIsCollapsed(false)}
                    className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    style={{ marginLeft: `${marginLeft}px` }}
                  >
                    {item.text}
                  </a>
                );
              })}
            </nav>
          </div>
        )}
      </div>
    );
  }

  if (tocItems.length === 0) {
    return (
      <div className="p-4 border-l-2 border-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <RiListCheck size="1.2em" />
          目录
        </h3>
        <p className="text-sm text-muted-foreground">暂无目录</p>
      </div>
    );
  }

  return (
    // 包裹容器 - 在固定时保持布局空间
    <div
      ref={containerRef}
      className={`transition-all duration-300 ${isCollapsed ? "w-12" : "w-64"}`}
      style={{
        height: isFixed ? `${tocDimensions.height}px` : "auto",
      }}
    >
      {/* 目录元素 - 同一个元素切换固定/非固定状态 */}
      <div
        ref={tocRef}
        className={`border-l-2 border-border ${isCollapsed ? "w-12" : "w-64"} overflow-x-hidden`}
        style={{
          position: isFixed ? "fixed" : "static",
          top: isFixed ? `${tocDimensions.top}px` : "auto",
          left: isFixed ? `${tocDimensions.left}px` : "auto",
          width: isFixed ? `${tocDimensions.width}px` : "auto",
          height: isFixed ? `${tocDimensions.height}px` : "auto", // 固定时保持相同高度
          maxHeight: "calc(100vh - 180px)", // 两种状态都限制最大高度
          overflowY: "auto", // 两种状态都允许滚动
          zIndex: isFixed ? 40 : "auto",
        }}
        data-fixed={isFixed}
      >
        <div className="p-4 bg-background">
          <div className="flex items-center justify-between mb-4">
            {!isCollapsed && (
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RiListCheck size="1.2em" />
                目录
              </h3>
            )}
          </div>

          {!isCollapsed && (
            <nav className="space-y-1">
              {tocItems.map((item) => {
                const isActive = activeId === item.id;
                const marginLeft = (item.level - 1) * 12;

                return (
                  <Link
                    key={item.id}
                    href={`#${item.id}`}
                    className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors truncate ${
                      isActive
                        ? "text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    style={{ marginLeft: `${marginLeft}px` }}
                    title={item.text}
                  >
                    {item.text}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
