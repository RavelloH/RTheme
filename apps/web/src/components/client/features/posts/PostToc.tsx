"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiLinkM,
  RiListCheck,
  RiSuperscript2,
} from "@remixicon/react";
import { AnimatePresence, motion } from "framer-motion";

import Link from "@/components/ui/Link";
import { useBroadcast, useBroadcastSender } from "@/hooks/use-broadcast";
import type {
  MDXContentMessage,
  ScrollProgressMessage,
} from "@/types/broadcast-messages";
import { AutoResizer } from "@/ui/AutoResizer";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { Drawer } from "@/ui/Drawer";
import { Tooltip } from "@/ui/Tooltip";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * 视口内的动态内容项类型
 */
interface ViewportContentItem {
  type: "link" | "code" | "footnote";
  id: string;
  href?: string;
  text?: string;
  isExternal?: boolean;
  language?: string;
  code?: string;
  footnoteId?: string;
  footnoteContent?: string;
}

interface PostTocProps {
  /**
   * 内容容器的选择器，默认为 '.md-content' 或 '.max-w-4xl'
   * PostToc 会从这个容器中自动提取标题
   */
  contentSelector?: string;
  isMobile?: boolean;
  transparent?: boolean;
}

function createHeadingSlug(text: string): string {
  const trimmed = text.trim().toLowerCase();
  const normalized = trimmed
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "section";
}

function ensureHeadingId(
  heading: HTMLElement,
  usedIds: Set<string>,
): string | null {
  const text = heading.textContent?.trim() || "";
  if (!text) return null;

  const initialId = heading.id?.trim();
  const baseId = initialId || createHeadingSlug(text);

  let id = baseId;
  let index = 2;
  while (usedIds.has(id)) {
    id = `${baseId}-${index}`;
    index += 1;
  }

  if (heading.id !== id) {
    heading.id = id;
  }

  usedIds.add(id);
  return id;
}

export default function PostToc({
  contentSelector = ".md-content, .max-w-4xl",
  isMobile = false,
  transparent = false,
}: PostTocProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const isCollapsed = false;
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null); // 包裹容器
  const tocRef = useRef<HTMLDivElement>(null); // 目录元素
  const [highlightStyle, setHighlightStyle] = useState({
    top: 0,
    height: 0,
    opacity: 0,
  });
  const [isMobileButtonVisible, setIsMobileButtonVisible] = useState(true);
  const navRef = useRef<HTMLElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mobileLastScrollTopRef = useRef(0);
  const mobileScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserClickRef = useRef(false);
  const clickedTargetIdRef = useRef<string | null>(null); // 记录点击的目标ID

  // 视口内容相关状态
  const [viewportItems, setViewportItems] = useState<ViewportContentItem[]>([]);

  // 广播滚动进度
  const { broadcast } = useBroadcastSender<ScrollProgressMessage>();

  // 将 em 单位转换为像素值
  const emToPx = (em: number): number => {
    if (typeof window === "undefined") return em * 16; // SSR 时使用默认值
    const fontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    return em * fontSize;
  };

  // 查找实际的滚动容器（找最外层的）
  const findScrollContainer = useCallback(
    (element: HTMLElement): HTMLElement | null => {
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
    },
    [],
  );

  // 检测元素是否在视口内
  const isElementInViewport = useCallback(
    (element: Element, scrollContainer: HTMLElement | null): boolean => {
      const rect = element.getBoundingClientRect();

      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        return (
          rect.top < containerRect.bottom &&
          rect.bottom > containerRect.top &&
          rect.left < containerRect.right &&
          rect.right > containerRect.left
        );
      }

      return (
        rect.top < window.innerHeight &&
        rect.bottom > 0 &&
        rect.left < window.innerWidth &&
        rect.right > 0
      );
    },
    [],
  );

  // 扫描视口内的内容
  const scanViewportContent = useCallback(() => {
    const contentContainer = document.querySelector(contentSelector);
    if (!contentContainer) return;

    const items: ViewportContentItem[] = [];
    const seenIds = new Set<string>();

    // 1. 扫描链接
    const links = contentContainer.querySelectorAll("a[href]");
    links.forEach((link, index) => {
      if (!isElementInViewport(link, scrollContainerRef.current)) return;

      const href = link.getAttribute("href") || "";
      const text = link.textContent?.trim() || href;

      if (!href || href.startsWith("#")) return;

      const id = `link-${index}-${href.slice(0, 20)}`;
      if (seenIds.has(id)) return;
      seenIds.add(id);

      const isExternal =
        href.startsWith("http://") || href.startsWith("https://");

      items.push({
        type: "link",
        id,
        href,
        text: text.length > 40 ? text.slice(0, 40) + "..." : text,
        isExternal,
      });
    });

    // 2. 扫描文中的脚注引用链接，获取对应脚注内容
    const footnoteRefs = contentContainer.querySelectorAll(
      'a[data-footnote-ref][href^="#user-content-fn"], a[data-footnote-ref][href^="#fn"]',
    );
    footnoteRefs.forEach((ref) => {
      if (!isElementInViewport(ref, scrollContainerRef.current)) return;

      const href = ref.getAttribute("href");
      if (!href) return;

      // 获取脚注 ID（去掉 # 前缀）
      const footnoteId = href.slice(1);

      const id = `footnote-${footnoteId}`;
      if (seenIds.has(id)) return;
      seenIds.add(id);

      // 查找对应的脚注内容
      const footnoteElement = document.querySelector(`#${footnoteId}`);
      if (!footnoteElement) return;

      // 获取脚注内容，移除返回链接的文本
      const clonedElement = footnoteElement.cloneNode(true) as HTMLElement;
      // 移除返回链接
      clonedElement
        .querySelectorAll("a[data-footnote-backref]")
        .forEach((el) => el.remove());
      const content = clonedElement.textContent?.trim() || "";

      // 从引用链接元素中获取显示的数字（如 1, 2, 3）
      const refText = ref.textContent?.trim() || "";
      // 提取纯数字
      const footnoteNumber = refText.match(/\d+/)?.[0] || "?";

      items.push({
        type: "footnote",
        id,
        footnoteId,
        footnoteContent: content,
        // 存储脚注编号用于显示
        text: footnoteNumber,
      });
    });

    setViewportItems(items);
  }, [contentSelector, isElementInViewport]);

  // 从 DOM 中提取目录
  const extractTocItems = useCallback(() => {
    const items: TocItem[] = [];

    // 查找内容容器
    const contentContainer = document.querySelector(contentSelector);
    if (!contentContainer) {
      console.warn(`PostToc: 未找到内容容器 "${contentSelector}"`);
      return;
    }

    // 查找所有已渲染的标题元素，并为缺失 id 的标题自动补全 id
    const headings = contentContainer.querySelectorAll(
      "h1, h2, h3, h4, h5, h6",
    );
    const usedIds = new Set<string>();

    headings.forEach((heading) => {
      const text = heading.textContent || "";
      const id = ensureHeadingId(heading as HTMLElement, usedIds);
      if (!id) return;

      // 获取原始标题级别
      const originalLevel = parseInt(heading.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.

      // 将 h1 当作 h2 处理，其他级别保持不变
      const adjustedLevel = originalLevel === 1 ? 2 : originalLevel;

      // 将所有目录层级减 1，使层级从 1 开始
      const level = Math.max(1, adjustedLevel - 1);

      items.push({ id, text, level });
    });

    setTocItems(items);
  }, [contentSelector]);

  // 初始提取目录
  useEffect(() => {
    extractTocItems();
  }, [extractTocItems]);

  // 监听 MDX 渲染完成广播，重新提取目录
  useBroadcast<MDXContentMessage>((message) => {
    if (
      message.type === "mdx-content-rendered" ||
      message.type === "mdx-content-recheck"
    ) {
      // 稍微延迟一下确保 DOM 完全更新
      setTimeout(() => {
        extractTocItems();
      }, 150);
    }
  });

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

    const fallbackContainer = findScrollContainer(containerRef.current);
    const scrollContainer = scrollContainerRef.current || fallbackContainer;
    const scrollTarget: EventTarget = (scrollContainer ||
      window) as EventTarget;

    // 保存滚动容器引用供后续使用
    scrollContainerRef.current = scrollContainer;

    const handleScroll = () => {
      // 计算滚动百分比 - 只计算文章内容部分
      let progress = 0;

      // 查找文章内容容器
      const contentContainer = document.querySelector(contentSelector);

      if (contentContainer) {
        const containerRect = contentContainer.getBoundingClientRect();
        const contentTop =
          containerRect.top +
          (scrollContainer?.scrollTop || window.scrollY || 0);
        const contentBottom = contentTop + containerRect.height;

        if (scrollContainer) {
          // 如果有滚动容器
          const scrollTop = scrollContainer.scrollTop;
          const viewportTop = scrollTop;
          const _viewportBottom = scrollTop + scrollContainer.clientHeight;

          if (viewportTop >= contentBottom) {
            // 已经滚动超过文章内容
            progress = 100;
          } else if (viewportTop < contentTop) {
            // 还没滚动到文章内容
            progress = 0;
          } else {
            // 在文章内容区域内
            const scrolledInContent = viewportTop - contentTop;
            const scrollableHeight = containerRect.height;
            progress =
              scrollableHeight > 0
                ? (scrolledInContent / scrollableHeight) * 100
                : 0;
          }
        } else {
          // 使用 window 的滚动信息
          const scrollTop =
            window.scrollY || document.documentElement.scrollTop;
          const viewportTop = scrollTop;
          const _viewportBottom = scrollTop + window.innerHeight;

          if (viewportTop >= contentBottom) {
            // 已经滚动超过文章内容
            progress = 100;
          } else if (viewportTop < contentTop) {
            // 还没滚动到文章内容
            progress = 0;
          } else {
            // 在文章内容区域内
            const scrolledInContent = viewportTop - contentTop;
            const scrollableHeight = containerRect.height;
            progress =
              scrollableHeight > 0
                ? (scrolledInContent / scrollableHeight) * 100
                : 0;
          }
        }
      }

      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // 广播滚动进度
      broadcast({
        type: "scroll-progress",
        progress: Math.min(100, Math.max(0, progress)),
      });

      // 更新活动标题 - 只在当前内容容器内查找，避免背景页面/其他区域标题干扰
      const headingRoot = contentContainer || document;
      const headings = headingRoot.querySelectorAll(
        "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]",
      );
      const activeThreshold = scrollContainer
        ? scrollContainer.getBoundingClientRect().top + emToPx(16)
        : emToPx(16);

      let currentActiveId = "";

      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= activeThreshold) {
          currentActiveId = heading.id;
        }
      });

      setActiveId(currentActiveId);

      // 同时扫描视口内容
      scanViewportContent();
    };

    scrollTarget.addEventListener("scroll", handleScroll as EventListener, {
      passive: true,
    });

    const initialCheckTimer = setTimeout(() => {
      handleScroll();
    }, 100);

    // 清理函数
    return () => {
      clearTimeout(initialCheckTimer);
      scrollTarget.removeEventListener("scroll", handleScroll as EventListener);
    };
  }, [
    findScrollContainer,
    isMobile,
    tocItems,
    scanViewportContent,
    broadcast,
    contentSelector,
  ]);

  // 更新高亮指示器位置
  useEffect(() => {
    if (isMobile && !isMobileDrawerOpen) {
      setHighlightStyle((prev) => ({ ...prev, opacity: 0 }));
      return;
    }

    if (isCollapsed || !activeId || !navRef.current || !tocRef.current) {
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

      // 如果是用户点击触发的
      if (isUserClickRef.current) {
        // 检查滚动是否已经到达目标位置
        if (clickedTargetIdRef.current === activeId) {
          // 滚动已完成，立即更新指示器
          setTimeout(updateHighlight, 100); // 稍微延迟确保DOM完全更新
          return;
        } else {
          // 还在滚动中，不更新指示器
          return;
        }
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
  }, [activeId, isCollapsed, tocItems, isMobile, isMobileDrawerOpen]);

  // 监听目录滚动，更新渐变遮罩显示状态
  useEffect(() => {
    if ((isMobile && !isMobileDrawerOpen) || isCollapsed || !navRef.current) {
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
  }, [isCollapsed, tocItems, isMobile, isMobileDrawerOpen]);

  // 移动端滚动进度监听
  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const handleScroll = () => {
      let progress = 0;

      // 查找文章内容容器
      const contentContainer = document.querySelector(contentSelector);

      if (contentContainer) {
        const containerRect = contentContainer.getBoundingClientRect();
        const contentTop = containerRect.top + (window.scrollY || 0);
        const contentBottom = contentTop + containerRect.height;
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const viewportTop = scrollTop;

        if (viewportTop >= contentBottom) {
          // 已经滚动超过文章内容
          progress = 100;
        } else if (viewportTop < contentTop) {
          // 还没滚动到文章内容
          progress = 0;
        } else {
          // 在文章内容区域内
          const scrolledInContent = viewportTop - contentTop;
          const scrollableHeight = containerRect.height;
          progress =
            scrollableHeight > 0
              ? (scrolledInContent / scrollableHeight) * 100
              : 0;
        }
      }

      const normalizedProgress = Math.min(100, Math.max(0, progress));
      setScrollProgress(normalizedProgress);

      // 广播滚动进度
      broadcast({
        type: "scroll-progress",
        progress: normalizedProgress,
      });

      // 更新活动标题（仅在当前内容容器中查找）
      const headingRoot = contentContainer || document;
      const headings = headingRoot.querySelectorAll(
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
      scanViewportContent();

      // 与 Footer 一致的移动端按钮显隐逻辑
      const currentScrollTop =
        window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const scrollBottom = scrollHeight - clientHeight - currentScrollTop;

      if (mobileScrollTimeoutRef.current) {
        clearTimeout(mobileScrollTimeoutRef.current);
      }

      const isScrollingDown = currentScrollTop > mobileLastScrollTopRef.current;
      const isScrollingUp = currentScrollTop < mobileLastScrollTopRef.current;
      const isNearBottom = scrollBottom < 50;

      if (isScrollingDown && !isNearBottom) {
        setIsMobileButtonVisible(false);
      } else if (isScrollingUp || isNearBottom) {
        setIsMobileButtonVisible(true);
      }

      mobileLastScrollTopRef.current = currentScrollTop;

      mobileScrollTimeoutRef.current = setTimeout(() => {
        if (currentScrollTop < 10) {
          setIsMobileButtonVisible(true);
        }
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    const initialTimer = setTimeout(handleScroll, 100); // 初始化

    return () => {
      clearTimeout(initialTimer);
      window.removeEventListener("scroll", handleScroll);
      if (mobileScrollTimeoutRef.current) {
        clearTimeout(mobileScrollTimeoutRef.current);
      }
    };
  }, [isMobile, contentSelector, scanViewportContent, broadcast]);

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

  const handleTocItemClick = (targetId: string, closeMobileDrawer = false) => {
    isUserClickRef.current = true;
    clickedTargetIdRef.current = targetId;

    if (closeMobileDrawer) {
      setIsMobileDrawerOpen(false);
    }

    // 延迟重置标记，确保页面滚动完成
    setTimeout(() => {
      isUserClickRef.current = false;
      clickedTargetIdRef.current = null;
    }, 1000);
  };

  const renderEmptyState = () => (
    <div className="p-4 border-l-2 border-border">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <RiListCheck size="1.2em" />
        目录
      </h3>
      <p className="text-sm text-muted-foreground">暂无目录</p>
    </div>
  );

  const renderTocBody = (closeMobileDrawer = false) => (
    <div className={`p-4 ${transparent ? "bg-transparent" : "bg-background"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-between w-full">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RiListCheck size="1.2em" />
            目录
          </h3>
          <div className="flex gap-2">
            <Clickable
              onClick={() => {
                scrollToTop();
                if (closeMobileDrawer) {
                  setIsMobileDrawerOpen(false);
                }
              }}
              hoverScale={1.2}
            >
              <div className="text-xs text-secondary-foreground hover:text-foreground">
                <RiArrowUpLine size="2em" />
              </div>
            </Clickable>
            <Clickable
              onClick={() => {
                scrollToComments();
                if (closeMobileDrawer) {
                  setIsMobileDrawerOpen(false);
                }
              }}
              hoverScale={1.2}
            >
              <div className="text-xs text-secondary-foreground hover:text-foreground">
                <RiArrowDownLine size="2em" />
              </div>
            </Clickable>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* 顶部渐变遮罩 */}
        {transparent ? null : (
          <div
            className={`absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background via-background/80 to-transparent pointer-events-none z-20 transition-opacity duration-300 ${
              showTopGradient ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* 底部渐变遮罩 */}
        {transparent ? null : (
          <div
            className={`absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none z-20 transition-opacity duration-300 ${
              showBottomGradient ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

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
                  handleTocItemClick(item.id, closeMobileDrawer);
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

      {/* 滚动进度和导航按钮 */}
      <div className="mt-6 pt-4 space-y-3 relative">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-border">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
        <div className="text-xs text-muted-foreground font-medium font-mono">
          {scrollProgress.toFixed(0)} %
        </div>
      </div>
      <AutoResizer>
        <AutoTransition>
          {/* 视口内容卡片 */}
          {viewportItems.length > 0 && (
            <div className="space-y-1 max-h-[30vh] overflow-y-auto scrollbar-hide scroll-smooth pt-4 border-t border-border mt-4 pb-4">
              <AnimatePresence mode="popLayout">
                {viewportItems.slice(0, 5).map((item) => {
                  const commonProps = {
                    initial: { opacity: 0, y: -8 },
                    animate: { opacity: 1, y: 0 },
                    exit: { opacity: 0, y: 8 },
                    transition: {
                      duration: 0.2,
                      ease: [0.25, 0.1, 0.25, 1] as const,
                    },
                    layout: true,
                  };

                  switch (item.type) {
                    case "link":
                      return (
                        <Tooltip
                          key={item.id}
                          content={
                            <div className="text-sm break-all">
                              <div className="font-medium mb-1">
                                {item.text}
                              </div>
                              <div className="text-muted-foreground">
                                {item.href}
                              </div>
                            </div>
                          }
                          placement="left"
                          maxWidth="300px"
                        >
                          <motion.div
                            {...commonProps}
                            className="group flex items-center gap-2 text-xs p-1.5 rounded hover:bg-muted/50 transition-colors overflow-hidden"
                          >
                            <RiLinkM
                              size="0.9em"
                              className="text-muted-foreground shrink-0"
                            />
                            <span className="truncate text-muted-foreground">
                              {item.text}
                            </span>
                          </motion.div>
                        </Tooltip>
                      );

                    case "footnote":
                      return (
                        <Tooltip
                          key={item.id}
                          content={
                            <div className="text-sm">
                              {item.footnoteContent}
                            </div>
                          }
                          placement="left"
                          maxWidth="300px"
                        >
                          <motion.div
                            {...commonProps}
                            className="group text-xs p-1.5 rounded hover:bg-muted/50 transition-colors overflow-hidden"
                          >
                            <div className="flex items-center gap-2">
                              <RiSuperscript2
                                size="0.9em"
                                className="text-muted-foreground shrink-0"
                              />
                              <span className="shrink-0 font-mono">
                                {item.text || "?"}
                              </span>
                              <span className="text-muted-foreground truncate">
                                {item.footnoteContent}
                              </span>
                            </div>
                          </motion.div>
                        </Tooltip>
                      );

                    default:
                      return null;
                  }
                })}
              </AnimatePresence>
              <AutoTransition>
                {viewportItems.length > 5 && (
                  <div
                    className="text-xs text-muted-foreground pl-1.5 pt-1"
                    key={viewportItems.length}
                  >
                    +{viewportItems.length - 5} 项
                  </div>
                )}
              </AutoTransition>
            </div>
          )}
        </AutoTransition>
      </AutoResizer>
    </div>
  );

  const renderDesktopStylePanel = (closeMobileDrawer = false) => {
    if (tocItems.length === 0) {
      return renderEmptyState();
    }

    return (
      <div ref={tocRef} className="w-full overflow-hidden relative">
        {/* 左侧边框 - 使用绝对定位 */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />

        {/* 动态高亮指示器 */}
        <div
          className="absolute left-0 bg-primary transition-all duration-300 ease-out pointer-events-none z-10"
          style={{
            top: `${highlightStyle.top}px`,
            height: `${highlightStyle.height}px`,
            width: "2px",
            opacity: highlightStyle.opacity,
          }}
        />

        {renderTocBody(closeMobileDrawer)}
      </div>
    );
  };

  if (isMobile) {
    return (
      <>
        <div
          className={`fixed right-4 [bottom:calc(env(safe-area-inset-bottom)+1rem)] z-[90] transition-all duration-300 ${
            isMobileButtonVisible
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-8 opacity-0 pointer-events-none"
          }`}
        >
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/50 px-4 py-4 text-foreground shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-md transition-colors hover:bg-background/60"
            title="目录"
            aria-label="打开目录"
          >
            <RiListCheck size="1em" className="shrink-0" />
          </button>
        </div>

        <Drawer
          open={isMobileDrawerOpen}
          onClose={() => setIsMobileDrawerOpen(false)}
          initialSize={0.6}
        >
          {renderDesktopStylePanel(true)}
        </Drawer>
      </>
    );
  }

  if (tocItems.length === 0) {
    return renderEmptyState();
  }

  return (
    <div
      ref={containerRef}
      className={`transition-all duration-300 h-full ${isCollapsed ? "w-12" : "w-64"}`}
    >
      <div
        className={`${isCollapsed ? "w-12" : "w-64"}`}
        style={{ maxHeight: "calc(100vh - 180px)" }}
      >
        {renderDesktopStylePanel()}
      </div>
    </div>
  );
}
