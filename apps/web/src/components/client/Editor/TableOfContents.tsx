"use client";

import { Editor } from "@tiptap/react";
import { useEffect, useState, useRef } from "react";
import { RiListCheck, RiArrowUpLine, RiArrowDownLine } from "@remixicon/react";
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
 * 编辑器目录组件 - 简化版
 *
 * 功能：
 * - 自动提取标题并生成目录
 * - 滚动高亮当前标题
 * - 点击跳转
 * - 快捷按钮（顶部/底部）
 */
export function TableOfContents({ editor }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [isReady, setIsReady] = useState(false); // 添加就绪状态
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

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
        const id = element.id; // 直接读取 CustomHeading 生成的 ID
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

  // 监听滚动，高亮当前标题
  useEffect(() => {
    if (!editor || headings.length === 0) return;

    const handleScroll = () => {
      // 获取正确的滚动容器 - 不是 editor.view.dom，而是它的父容器
      const scrollContainer = document.getElementById(
        "tiptap-scroll-container",
      );
      if (!scrollContainer) return;

      const scrollTop = scrollContainer.scrollTop || 0;
      let currentActiveId = "";

      // 找到当前滚动位置最接近的标题
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();
          const relativeTop = rect.top - containerRect.top + scrollTop;

          if (relativeTop <= scrollTop + 100) {
            currentActiveId = heading.id;
          }
        }
      });

      setActiveId(currentActiveId);
    };

    // 在正确的容器上监听滚动事件
    const scrollContainer = document.getElementById("tiptap-scroll-container");
    if (!scrollContainer) return;

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // 初始化

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, [editor, headings]);

  // 更新高亮指示器位置
  useEffect(() => {
    if (!activeId || !navRef.current || !highlightRef.current) {
      if (highlightRef.current) {
        highlightRef.current.style.opacity = "0";
      }
      return;
    }

    const activeLink = navRef.current.querySelector(
      `a[href="#${activeId}"]`,
    ) as HTMLElement;

    if (activeLink && highlightRef.current) {
      // 获取父容器（带 p-4 的 div）
      const parentContainer = highlightRef.current.parentElement;
      if (!parentContainer) return;

      const parentRect = parentContainer.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();

      // 计算相对于父容器的位置
      const top = linkRect.top - parentRect.top;
      const height = linkRect.height;

      highlightRef.current.style.top = `${top}px`;
      highlightRef.current.style.height = `${height}px`;
      highlightRef.current.style.opacity = "1";
    }
  }, [activeId, headings]);

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

    const containerRect = scrollContainer.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    const scrollTop =
      elementRect.top - containerRect.top + scrollContainer.scrollTop - 100; // 留 100px 顶部空间

    scrollContainer.scrollTo({ top: scrollTop, behavior: "smooth" });
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

        {/* 目录列表 */}
        <nav
          ref={navRef}
          className="space-y-1 relative max-h-[50vh] overflow-y-auto overflow-x-hidden scrollbar-hide"
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
    </div>
  );
}
