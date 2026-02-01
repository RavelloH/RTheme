"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RiArrowDownLine, RiArrowUpLine, RiListCheck } from "@remixicon/react";
import type { Editor } from "@tiptap/react";

import Clickable from "@/ui/Clickable";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  editor: Editor | null;
}

/**
 * 编辑器目录组件 - 增强版
 *
 * 功能：
 * - 自动提取标题并生成目录
 * - 滚动高亮当前标题
 * - 点击跳转
 * - 滚动进度显示
 * - 渐变遮罩
 * - 智能指示器定位
 */
export function TableOfContents({ editor }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isReady, setIsReady] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTopGradient, setShowTopGradient] = useState(false);
  const [showBottomGradient, setShowBottomGradient] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUserClickRef = useRef(false);
  const clickedTargetIdRef = useRef<string | null>(null);

  // 将 em 单位转换为像素值
  const emToPx = useCallback((em: number): number => {
    if (typeof window === "undefined") return em * 16;
    const fontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    return em * fontSize;
  }, []);

  // 提取标题（ID 已由 CustomHeading 自动生成）
  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      const editorElement = editor.view.dom;
      const headingElements = editorElement.querySelectorAll(
        "h1, h2, h3, h4, h5, h6",
      );

      const newHeadings: Heading[] = [];

      headingElements.forEach((element) => {
        const text = element.textContent || "";
        const id = element.id;
        const level = parseInt(element.tagName.substring(1));

        if (id && text) {
          newHeadings.push({ id, text, level });
        }
      });

      setHeadings(newHeadings);

      // 标题加载完成后，延迟一点再显示，确保布局稳定
      if (!isReady && newHeadings.length >= 0) {
        setTimeout(() => setIsReady(true), 150);
      }
    };

    // 初始化
    setTimeout(updateHeadings, 100);

    // 监听内容变化
    editor.on("update", updateHeadings);

    return () => {
      editor.off("update", updateHeadings);
    };
  }, [editor, isReady]);

  // 监听滚动，高亮当前标题 + 计算进度
  useEffect(() => {
    if (!editor || headings.length === 0) return;

    const handleScroll = () => {
      const scrollContainer = document.getElementById(
        "tiptap-scroll-container",
      );
      if (!scrollContainer) return;

      const scrollTop = scrollContainer.scrollTop || 0;
      const scrollHeight = scrollContainer.scrollHeight;
      const clientHeight = scrollContainer.clientHeight;

      // 计算滚动进度
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // 更新活动标题
      const activeThreshold = emToPx(6);
      let currentActiveId = "";

      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top;

          if (relativeTop <= activeThreshold) {
            currentActiveId = heading.id;
          }
        }
      });

      setActiveId(currentActiveId);
    };

    const scrollContainer = document.getElementById("tiptap-scroll-container");
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [editor, headings, emToPx]);

  // 更新高亮指示器位置
  useEffect(() => {
    if (
      !activeId ||
      !navRef.current ||
      !highlightRef.current ||
      !containerRef.current
    ) {
      if (highlightRef.current) {
        highlightRef.current.style.opacity = "0";
      }
      return;
    }

    // 清理之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = null;
    }

    const activeElement = navRef.current.querySelector(
      `a[href="#${activeId}"]`,
    ) as HTMLElement;

    if (activeElement && containerRef.current && highlightRef.current) {
      const isScrollable =
        navRef.current.scrollHeight > navRef.current.clientHeight;

      // 更新高亮指示器的函数
      const updateHighlight = () => {
        if (
          navRef.current &&
          containerRef.current &&
          highlightRef.current &&
          activeElement
        ) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const activeRect = activeElement.getBoundingClientRect();
          const navRect = navRef.current.getBoundingClientRect();

          // 计算相对于容器的位置
          const top = activeRect.top - containerRect.top;
          const height = activeRect.height;

          // 检查是否在可视区域内
          const isInView =
            activeRect.top >= navRect.top &&
            activeRect.bottom <= navRect.bottom;

          highlightRef.current.style.top = `${top}px`;
          highlightRef.current.style.height = `${height}px`;
          highlightRef.current.style.opacity = isInView ? "1" : "0";
        }
        isScrollingRef.current = false;
      };

      // 如果是用户点击触发的
      if (isUserClickRef.current) {
        // 检查滚动是否已经到达目标位置
        if (clickedTargetIdRef.current === activeId) {
          // 滚动已完成，立即更新指示器
          setTimeout(updateHighlight, 100);
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

        // 判断是否需要滚动
        const needsScroll = Math.abs(desiredScrollTop - currentScrollTop) > 1;

        if (needsScroll) {
          // 如果正在滚动中，延迟执行
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
            return;
          }

          // 触发滚动
          isScrollingRef.current = true;
          navRef.current.scrollTo({
            top: desiredScrollTop,
            behavior: "smooth",
          });

          // 等待滚动完成后更新指示器
          scrollTimeoutRef.current = setTimeout(updateHighlight, 400);
        } else {
          // 不需要滚动，立即更新
          updateHighlight();
        }
      } else {
        // 不可滚动，立即更新
        updateHighlight();
      }
    } else {
      if (highlightRef.current) {
        highlightRef.current.style.opacity = "0";
      }
    }
  }, [activeId, headings, emToPx]);

  // 监听目录滚动，更新渐变遮罩
  useEffect(() => {
    if (!navRef.current) {
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

      setShowTopGradient(scrollTop > 10);
      setShowBottomGradient(scrollTop < scrollHeight - clientHeight - 10);
    };

    const handleScroll = () => {
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
  }, [headings]);

  // 滚动到顶部
  const scrollToTop = () => {
    const scrollContainer = document.getElementById("tiptap-scroll-container");
    if (!scrollContainer) return;
    scrollContainer.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 滚动到底部
  const scrollToBottom = () => {
    const scrollContainer = document.getElementById("tiptap-scroll-container");
    if (!scrollContainer) return;
    scrollContainer.scrollTo({
      top: scrollContainer.scrollHeight,
      behavior: "smooth",
    });
  };

  // 点击标题跳转
  const handleHeadingClick = (id: string) => {
    const element = document.getElementById(id);
    const scrollContainer = document.getElementById("tiptap-scroll-container");
    if (!element || !scrollContainer) return;

    isUserClickRef.current = true;
    clickedTargetIdRef.current = id;

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const scrollTop =
      elementRect.top - containerRect.top + scrollContainer.scrollTop - 100;

    scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });

    // 延迟重置标记
    setTimeout(() => {
      isUserClickRef.current = false;
      clickedTargetIdRef.current = null;
    }, 1000);
  };

  if (headings.length === 0) {
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
    <div
      ref={containerRef}
      className={`overflow-hidden relative transition-all duration-300 ${
        isReady ? "w-64 opacity-100" : "w-0 opacity-0"
      }`}
    >
      <div className="p-4 bg-background relative w-64">
        {/* 左侧边框 */}
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />

        {/* 动态高亮指示器 */}
        <div
          ref={highlightRef}
          className="absolute left-0 bg-primary transition-all duration-300 ease-out pointer-events-none z-10"
          style={{
            width: "2px",
            opacity: 0,
          }}
        />

        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RiListCheck size="1.2em" />
            目录
          </h3>
          <div className="flex gap-2">
            <Clickable onClick={scrollToTop} hoverScale={1.2}>
              <div className="text-xs text-secondary-foreground hover:text-foreground">
                <RiArrowUpLine size="2em" />
              </div>
            </Clickable>
            <Clickable onClick={scrollToBottom} hoverScale={1.2}>
              <div className="text-xs text-secondary-foreground hover:text-foreground">
                <RiArrowDownLine size="2em" />
              </div>
            </Clickable>
          </div>
        </div>

        {/* 目录列表容器 */}
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

          {/* 目录列表 */}
          <nav
            ref={navRef}
            className="space-y-1 relative max-h-[40vh] overflow-y-auto overflow-x-hidden scrollbar-hide"
          >
            {headings.map((heading) => {
              const isActive = activeId === heading.id;
              const marginLeft = (heading.level - 1) * 12;

              return (
                <a
                  key={heading.id}
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleHeadingClick(heading.id);
                  }}
                  className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors truncate cursor-pointer ${
                    isActive
                      ? "text-foreground font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ marginLeft: `${marginLeft}px` }}
                  title={heading.text}
                >
                  {heading.text}
                </a>
              );
            })}
          </nav>
        </div>

        {/* 滚动进度 */}
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
      </div>
    </div>
  );
}
