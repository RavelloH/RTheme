"use client";

import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { codeToHtml } from "shiki";
import Link from "@/components/Link";

interface MarkdownRendererProps {
  source: string;
  className?: string;
}

/**
 * 代码块组件（使用 Shiki 高亮）
 */
const CodeBlockComponent = (props: React.HTMLAttributes<HTMLElement>) => {
  const { children, className, ...rest } = props;
  const [html, setHtml] = useState("");
  const language = className?.replace(/language-/, "") || "text";

  const code = React.Children.toArray(children).join("").replace(/\n$/, "");

  React.useEffect(() => {
    const highlightCode = async () => {
      try {
        const highlighted = await codeToHtml(code, {
          lang: language,
          themes: {
            light: "light-plus",
            dark: "dark-plus",
          },
        });
        setHtml(highlighted);
      } catch (err) {
        console.error("Shiki 语法高亮错误:", {
          error: err,
          language,
          codeLength: code.length,
        });

        setHtml(
          `<pre class="shiki bg-foreground/5 p-4 rounded-lg overflow-x-auto"><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
        );
      }
    };

    highlightCode();
  }, [code, language]);

  return <div dangerouslySetInnerHTML={{ __html: html }} {...rest} />;
};

/**
 * 客户端 Markdown 组件配置
 */
const markdownComponents = {
  // 代码处理
  pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => <>{children}</>,
  code: (props: React.HTMLAttributes<HTMLElement>) => {
    const { children, className } = props;

    // 如果有 className (通常是 language-*), 说明是代码块
    if (className) {
      return <CodeBlockComponent {...props} />;
    }

    // 行内代码
    return <code {...props}>{children}</code>;
  },

  // 链接
  a: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    // 对于外部链接，Link组件会自动处理
    return (
      <Link href={href || ""} {...rest} presets={["hover-underline"]}>
        {children}
      </Link>
    );
  },

  // 图片
  img: ({
    src,
    alt,
    width,
    height,
    ...rest
  }: React.ImgHTMLAttributes<HTMLImageElement>) => {
    const imgSrc = typeof src === "string" ? src : "";
    const imgWidth = width ? Number(width) : 800;
    const imgHeight = height ? Number(height) : 400;
    const imgAlt =
      alt ||
      (imgSrc ? imgSrc.split("/").pop()?.split("?")[0] || "图片" : "图片");

    return (
      <div className="relative my-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={imgAlt}
          width={imgWidth}
          height={imgHeight}
          {...rest}
        />
      </div>
    );
  },

  // 表格
  table: ({ children, ...rest }: React.HTMLAttributes<HTMLTableElement>) => (
    <div className="overflow-x-auto my-6">
      <table className="min-w-full border-collapse" {...rest}>
        {children}
      </table>
    </div>
  ),
  thead: ({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-foreground/5" {...rest}>
      {children}
    </thead>
  ),
  tbody: ({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...rest}>{children}</tbody>
  ),
  tr: ({ children, ...rest }: React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr className="border-b border-foreground/10" {...rest}>
      {children}
    </tr>
  ),
  th: ({ children, ...rest }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="px-4 py-2 text-left font-semibold border border-foreground/20"
      {...rest}
    >
      {children}
    </th>
  ),
  td: ({ children, ...rest }: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td className="px-4 py-2 border border-foreground/20" {...rest}>
      {children}
    </td>
  ),

  // 其他元素
  p: ({ children, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-4 leading-relaxed" {...rest}>
      {children}
    </p>
  ),
  ul: ({ children, ...rest }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside my-4 space-y-1" {...rest}>
      {children}
    </ul>
  ),
  ol: ({ children, ...rest }: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal list-inside my-4 space-y-1" {...rest}>
      {children}
    </ol>
  ),
  li: ({ children, ...rest }: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="my-1" {...rest}>
      {children}
    </li>
  ),
  blockquote: ({
    children,
    ...rest
  }: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="border-l-4 border-foreground/20 pl-4 my-4 italic"
      {...rest}
    >
      {children}
    </blockquote>
  ),
  hr: ({ ...rest }: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="border-foreground/20 my-8" {...rest} />
  ),

  // Markdown 扩展元素（删除线、下划线、高亮、上下标）
  del: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
    <del className="line-through text-muted-foreground" {...rest}>
      {children}
    </del>
  ),
  u: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
    <u className="underline" {...rest}>
      {children}
    </u>
  ),
  mark: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
    <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded" {...rest}>
      {children}
    </mark>
  ),
  sup: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
    <sup className="text-xs align-super" {...rest}>
      {children}
    </sup>
  ),
  sub: ({ children, ...rest }: React.HTMLAttributes<HTMLElement>) => (
    <sub className="text-xs align-sub" {...rest}>
      {children}
    </sub>
  ),
};

export default function MarkdownRenderer({
  source,
  className = "max-w-4xl mx-auto md-content",
}: MarkdownRendererProps) {
  return (
    <div className={className}>
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeSlug, rehypeRaw]}
        components={markdownComponents}
      >
        {source}
      </Markdown>
    </div>
  );
}
