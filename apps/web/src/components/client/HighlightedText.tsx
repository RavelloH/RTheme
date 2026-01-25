"use client";

interface HighlightedTextProps {
  html: string;
  className?: string;
}

/**
 * 安全地渲染包含高亮标记的 HTML 文本
 * 只允许 <mark> 标签，其他 HTML 会被转义
 */
export default function HighlightedText({
  html,
  className = "",
}: HighlightedTextProps) {
  return (
    <span className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
