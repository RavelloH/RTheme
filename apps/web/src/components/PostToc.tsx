"use client";

import React, { useState, useEffect } from "react";
import { RiListCheck, RiMenuLine, RiCloseLine } from "@remixicon/react";

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

  // 提取目录
  useEffect(() => {
    const items: TocItem[] = [];

    // 创建一个临时的 DOM 元素来解析内容
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = content;

    // 查找所有标题元素
    const headings = tempDiv.querySelectorAll("h1, h2, h3, h4, h5, h6");

    headings.forEach((heading, index) => {
      const text = heading.textContent || "";
      const level = parseInt(heading.tagName.substring(1)); // h1 -> 1, h2 -> 2, etc.

      // 生成 id，如果没有的话
      let id = heading.id;
      if (!id) {
        id = `heading-${index}`;
        heading.id = id;
      }

      items.push({ id, text, level });
    });

    setTocItems(items);
  }, [content]);

  // 监听滚动，更新活动标题
  useEffect(() => {
    const handleScroll = () => {
      const headings = document.querySelectorAll(
        "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]",
      );

      let currentActiveId = "";
      headings.forEach((heading) => {
        const rect = heading.getBoundingClientRect();
        if (rect.top <= 100) {
          currentActiveId = heading.id;
        }
      });

      setActiveId(currentActiveId);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // 初始检查

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 点击目录项
  const handleTocClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // 导航栏高度偏移
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
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
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTocClick(item.id);
                      setIsCollapsed(false);
                    }}
                    className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    style={{ marginLeft: `${marginLeft}px` }}
                  >
                    {item.text}
                  </button>
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
      <div className="sticky top-20 p-4 border-l-2 border-border">
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
      className={`sticky top-20 border-l-2 border-border transition-all duration-300 ${isCollapsed ? "w-12" : "w-64"}`}
    >
      <div className="p-4">
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
              const marginLeft = (item.level - 1) * 12; // 每级缩进 12px

              return (
                <button
                  key={item.id}
                  onClick={() => handleTocClick(item.id)}
                  className={`block w-full text-left px-2 py-1 rounded text-sm transition-colors truncate ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  style={{ marginLeft: `${marginLeft}px` }}
                  title={item.text}
                >
                  {item.text}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
