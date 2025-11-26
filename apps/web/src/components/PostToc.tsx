"use client";

import React, { useState, useEffect, useRef } from "react";
import { RiListCheck, RiArrowUpLine, RiArrowDownLine } from "@remixicon/react";
import Link from "./Link";
import Clickable from "@/ui/Clickable";

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
  const [highlightStyle, setHighlightStyle] = useState({
    top: 0,
    height: 0,
    opacity: 0,
  });
  const navRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserClickRef = useRef(false);

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

    headings.forEach((heading) => {
      const text = heading.textContent || "";
      // 将 h1 当作 h2 处理，其他级别保持不变
      const originalLevel = parseInt(heading.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.
      const adjustedLevel = originalLevel === 1 ? 2 : originalLevel;

      // 将所有目录层级减 1，使层级从 1 开始
      const level = Math.max(1, adjustedLevel - 1);

      const id = generateSlug(text);

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

    // 保存滚动容器引用供后续使用
    scrollContainerRef.current = scrollContainer;

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
      // 计算滚动百分比
      let progress = 0;
      if (scrollContainer) {
        // 如果有滚动容器，使用容器的滚动信息
        const containerHeight = scrollContainer.clientHeight;
        const contentHeight = scrollContainer.scrollHeight;
        const scrollTop = scrollContainer.scrollTop;
        const scrollableHeight = contentHeight - containerHeight;
        progress =
          scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
      } else {
        // 否则使用 window 的滚动信息
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollableHeight = documentHeight - windowHeight;
        progress =
          scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
      }
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // 更新活动标题 - 使用 id 直接匹配，因为标题元素现在有了正确的 id
      const headings = document.querySelectorAll(
        "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]",
      );
      const activeThreshold = emToPx(16);

      let currentActiveId = "";

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= activeThreshold) {
          currentActiveId = heading.id;
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

  // 更新高亮指示器位置
  useEffect(() => {
    if (
      isMobile ||
      isCollapsed ||
      !activeId ||
      !navRef.current ||
      !tocRef.current
    ) {
      setHighlightStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    // 清理之前的滚动定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    // 查找当前激活的目录项元素
    const activeElement = navRef.current.querySelector(
      `a[href="#${activeId}"]`,
    ) as HTMLElement;

    if (activeElement && tocRef.current) {
      // 判断 nav 是否可滚动
      const isScrollable =
        navRef.current.scrollHeight > navRef.current.clientHeight;

      // 更新高亮指示器的函数
      const updateHighlight = () => {
        if (navRef.current && tocRef.current && activeElement) {
          // 使用 getBoundingClientRect 获取相对于 tocRef 的位置
          const tocRect = tocRef.current.getBoundingClientRect();
          const activeRect = activeElement.getBoundingClientRect();
          const navRect = navRef.current.getBoundingClientRect();

          // 计算相对于 tocRef 容器的位置
          const top = activeRect.top - tocRect.top;
          const height = activeRect.height;

          // 检查高亮项是否在目录可视区域内
          const isInView =
            activeRect.top >= navRect.top &&
            activeRect.bottom <= navRect.bottom;

          setHighlightStyle({
            top,
            height,
            opacity: isInView ? 1 : 0,
          });
        }
        isScrollingRef.current = false;
      };

      // 如果是用户点击触发的，在1000ms内不更新指示器
      if (isUserClickRef.current) {
        return;
      }

      if (isScrollable) {
        // 计算目标滚动位置
        const targetOffset = emToPx(5);
        const elementOffsetTop = activeElement.offsetTop;
        const rawDesiredScrollTop = elementOffsetTop - targetOffset;

        // 限制在合法滚动范围内
        const maxScrollTop =
          navRef.current.scrollHeight - navRef.current.clientHeight;
        const desiredScrollTop = Math.max(
          0,
          Math.min(rawDesiredScrollTop, maxScrollTop),
        );
        const currentScrollTop = navRef.current.scrollTop;

        // 判断是否真的需要滚动（差异大于 1px）
        const needsScroll = Math.abs(desiredScrollTop - currentScrollTop) > 1;

        if (needsScroll) {
          // 如果正在滚动中，延迟执行新的滚动
          if (isScrollingRef.current) {
            scrollTimeoutRef.current = setTimeout(() => {
              if (navRef.current) {
                navRef.current.scrollTo({
                  top: desiredScrollTop,
                  behavior: "smooth",
                });
                isScrollingRef.current = true;
                scrollTimeoutRef.current = setTimeout(updateHighlight, 200);
              }
            }, 100);
            return () => {
              if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
              }
            };
          }

          // 如果需要滚动，先触发滚动，然后延迟更新指示器
          isScrollingRef.current = true;
          navRef.current.scrollTo({
            top: desiredScrollTop,
            behavior: "smooth",
          });

          // 等待滚动完成后再更新高亮指示器位置
          scrollTimeoutRef.current = setTimeout(updateHighlight, 400);
          return () => {
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
            }
          };
        } else {
          // 如果不需要滚动，立即更新指示器
          updateHighlight();
        }
      } else {
        // 如果不可滚动，立即更新指示器
        updateHighlight();
      }
    } else {
      setHighlightStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, [activeId, isCollapsed, isMobile, tocItems]);

  // 监听目录滚动，更新渐变遮罩显示状态
  useEffect(() => {
    if (isMobile || isCollapsed || !navRef.current) {
      setShowTopGradient(false);
      setShowBottomGradient(false);
      return;
    }

    let rafId: number | null = null;

    const updateGradients = () => {
      if (!navRef.current) return;

      const { scrollTop, scrollHeight, clientHeight } = navRef.current;
      const isScrollable = scrollHeight > clientHeight;

      if (!isScrollable) {
        setShowTopGradient(false);
        setShowBottomGradient(false);
        return;
      }

      // 显示顶部渐变：不在顶部时显示
      setShowTopGradient(scrollTop > 10);

      // 显示底部渐变：不在底部时显示
      setShowBottomGradient(scrollTop < scrollHeight - clientHeight - 10);
    };

    const handleScroll = () => {
      // 使用 requestAnimationFrame 优化性能
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      rafId = requestAnimationFrame(updateGradients);
    };

    updateGradients();

    const nav = navRef.current;
    nav.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      nav.removeEventListener("scroll", handleScroll);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isMobile, isCollapsed, tocItems]);

  // 移动端滚动进度监听
  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollableHeight = documentHeight - windowHeight;
      const progress =
        scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // 初始化

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isMobile]);

  // 回到顶部
  const scrollToTop = () => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  // 前往底部评论区
  const scrollToComments = () => {
    const commentsSection = document.querySelector("#comments");
    if (commentsSection) {
      commentsSection.scrollIntoView({ behavior: "smooth" });
    } else {
      // 如果没有评论区，滚动到页面底部
      const scrollContainer = scrollContainerRef.current;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      } else {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth",
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
                    onClick={() => {
                      isUserClickRef.current = true;
                      setIsCollapsed(false);
                      // 延迟重置标记，确保页面滚动完成
                      setTimeout(() => {
                        isUserClickRef.current = false;
                      }, 1000);
                    }}
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

            {/* 滚动进度和导航按钮 */}
            <div className="mt-4 pt-4 space-y-3 relative">
              {/* 进度条分隔线 */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-border">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>

              {/* 进度百分比 */}
              <div className="text-xs text-muted-foreground font-medium font-mono">
                {scrollProgress.toFixed(0)} %
              </div>

              {/* 导航按钮 */}
              <div className="flex gap-2">
                <Clickable
                  onClick={() => {
                    scrollToTop();
                    setIsCollapsed(false);
                  }}
                  className="flex-1"
                  hoverScale={1.05}
                >
                  <div className="w-full px-3 py-2 text-xs bg-muted text-foreground rounded transition-colors flex items-center justify-center gap-1">
                    <RiArrowUpLine size="1em" />
                    <span>顶部</span>
                  </div>
                </Clickable>
                <Clickable
                  onClick={() => {
                    scrollToComments();
                    setIsCollapsed(false);
                  }}
                  className="flex-1"
                  hoverScale={1.05}
                >
                  <div className="w-full px-3 py-2 text-xs bg-muted text-foreground rounded transition-colors flex items-center justify-center gap-1">
                    <RiArrowDownLine size="1em" />
                    <span>评论</span>
                  </div>
                </Clickable>
              </div>
            </div>
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
        className={`${isCollapsed ? "w-12" : "w-64"} overflow-hidden relative`}
        style={{
          position: isFixed ? "fixed" : "relative",
          top: isFixed ? `${tocDimensions.top}px` : "auto",
          left: isFixed ? `${tocDimensions.left}px` : "auto",
          width: isFixed ? `${tocDimensions.width}px` : "auto",
          height: isFixed ? `${tocDimensions.height}px` : "auto", // 固定时保持相同高度
          maxHeight: "calc(100vh - 180px)", // 两种状态都限制最大高度
          zIndex: isFixed ? 40 : "auto",
        }}
        data-fixed={isFixed}
      >
        {/* 左侧边框 - 使用绝对定位 */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />

        {/* 动态高亮指示器 */}
        {!isCollapsed && (
          <div
            className="absolute left-0 bg-primary transition-all duration-300 ease-out pointer-events-none z-10"
            style={{
              top: `${highlightStyle.top}px`,
              height: `${highlightStyle.height}px`,
              width: "2px", // 与边框相同的宽度
              opacity: highlightStyle.opacity,
            }}
          />
        )}

        <div className="p-4 bg-background">
          <div className="flex items-center justify-between mb-4">
            {!isCollapsed && (
              <div className="flex items-center justify-between w-full">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <RiListCheck size="1.2em" />
                  目录
                </h3>
                <div>
                  {/* 导航按钮 */}
                  <div className="flex gap-2">
                    <Clickable onClick={scrollToTop} hoverScale={1.2}>
                      <div className="text-xs text-secondary-foreground hover:text-foreground">
                        <RiArrowUpLine size="2em" />
                      </div>
                    </Clickable>
                    <Clickable onClick={scrollToComments} hoverScale={1.2}>
                      <div className="text-xs  text-secondary-foreground hover:text-foreground">
                        <RiArrowDownLine size="2em" />
                      </div>
                    </Clickable>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="relative">
              {/* 顶部渐变遮罩 */}
              <div
                className={`absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-20 transition-opacity duration-300 ${
                  showTopGradient ? "opacity-100" : "opacity-0"
                }`}
              />

              {/* 底部渐变遮罩 */}
              <div
                className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-20 transition-opacity duration-300 ${
                  showBottomGradient ? "opacity-100" : "opacity-0"
                }`}
              />

              <nav
                ref={navRef}
                className="space-y-1 relative max-h-[40vh] overflow-y-auto overflow-x-hidden scrollbar-hide"
              >
                {tocItems.map((item) => {
                  const isActive = activeId === item.id;
                  const marginLeft = (item.level - 1) * 12;

                  return (
                    <Link
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={() => {
                        isUserClickRef.current = true;
                        // 延迟重置标记，确保页面滚动完成
                        setTimeout(() => {
                          isUserClickRef.current = false;
                        }, 1000);
                      }}
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
            </div>
          )}

          {/* 滚动进度和导航按钮 */}
          {!isCollapsed && (
            <div className="mt-6 pt-4 space-y-3 relative">
              {/* 进度条分隔线 */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-border">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-out"
                  style={{ width: `${scrollProgress}%` }}
                />
              </div>

              {/* 进度百分比 */}
              <div className="text-xs text-muted-foreground font-medium font-mono">
                {scrollProgress.toFixed(0)} %
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
