import React from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

import { replacePlaceholders } from "@/blocks/lib/shared";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
} from "@/lib/shared/mdx-config-shared";

export interface ProcessedTextProps {
  /**
   * 原始文本，支持 Markdown 和 {placeholder}
   */
  text?: string;
  /**
   * 用于替换占位符的数据对象
   */
  data?: Record<string, unknown>;
  /**
   * 根元素的类名
   */
  className?: string;
  /**
   * 是否作为内联元素渲染。
   * 如果为 true，将移除 Markdown 生成的外层 <p> 标签，使其可以嵌入到其他块级元素（如 h1, span）中。
   */
  inline?: boolean;
  /**
   * 是否禁用 Markdown 渲染，仅进行占位符替换。
   */
  disableMarkdown?: boolean;
  /**
   * 传递给 ReactMarkdown 的 components 属性，用于自定义渲染
   */
  components?: React.ComponentProps<typeof ReactMarkdown>["components"];
}

// 纯服务端的基础组件映射
const SERVER_BASE_COMPONENTS: React.ComponentProps<
  typeof ReactMarkdown
>["components"] = {
  // 链接：使用 Next.js Link
  a: ({
    href,
    children,
    className,
    node: _node,
    style: _style,
    ..._unusedProps
  }) => {
    const isInternal = href?.startsWith("/") || href?.startsWith("#");
    if (isInternal) {
      return (
        <Link href={href || ""} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  },
  // 表格：添加滚动容器
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-6">
      <table {...props}>{children}</table>
    </div>
  ),
  // 简化的代码块 (无 Shiki 高亮，仅基础样式，避免引入庞大的高亮库到客户端，也避免服务端异步问题)
  code: ({ className, children, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <pre className="p-4 rounded-lg overflow-x-auto my-4 bg-muted text-muted-foreground">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    );
  },
};

/**
 * 通用文本处理组件 (Server Component)
 * 1. 执行占位符替换 {key} -> value
 * 2. 渲染 Markdown (可选)
 *
 * 注意：此组件设计为在服务端渲染。
 * 如果在 Client Component 中导入使用，它及其依赖(react-markdown)会被打包到客户端。
 * 建议仅在 Server Components (如 Blocks) 中使用。
 */
export function ProcessedText({
  text,
  data,
  className,
  inline = false,
  disableMarkdown = false,
  components: customComponents,
}: ProcessedTextProps) {
  if (!text) return null;

  // 1. 插值
  const content = replacePlaceholders(text, data || {});

  // 2. 纯文本模式
  if (disableMarkdown) {
    // 如果是 inline 模式，且没有指定 tag，默认 span
    const Tag = inline ? "span" : "div";
    return <Tag className={className}>{content}</Tag>;
  }

  // 3. Markdown 渲染
  const Wrapper = inline ? "span" : "div";

  // 组合组件配置 (移除 useMemo，因为这是 Server Component，每次渲染都是一次性的)
  const components = {
    ...SERVER_BASE_COMPONENTS,
    // 如果是 inline 模式，使用 Fragment 替换 p 标签
    p: inline ? React.Fragment : undefined,
    ...customComponents,
  };

  return (
    <Wrapper className={`processed-text ${className || ""}`.trim()}>
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </Wrapper>
  );
}
