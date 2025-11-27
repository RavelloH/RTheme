import React from "react";
import CMSImage from "@/components/CMSImage";
import Link from "@/components/Link";
import { codeToHtml } from "shiki";
import type { Components } from "react-markdown";
import type { MDXComponents } from "next-mdx-remote-client/rsc";

/**
 * 渲染适配器
 * 统一 Markdown 和 MDX 的组件渲染配置
 * 只需定义一次，同时应用到两种模式
 */

/**
 * 代码块组件（使用 Shiki 高亮）
 */
const CodeBlock = async ({
  children,
  className,
}: {
  children?: string | string[];
  className?: string;
}) => {
  const language = className?.replace(/language-/, "") || "text";
  const code = (
    Array.isArray(children) ? children.join("") : String(children)
  ).replace(/\n$/, "");

  try {
    const html = await codeToHtml(code, {
      lang: language,
      themes: {
        light: "light-plus",
        dark: "dark-plus",
      },
    });
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  } catch (err) {
    console.error("Shiki 语法高亮错误:", {
      error: err,
      language,
      codeLength: code.length,
    });

    return (
      <pre className="shiki bg-foreground/5 p-4 rounded-lg overflow-x-auto">
        <code>{code}</code>
      </pre>
    );
  }
};

/**
 * 行内代码组件
 */
const InlineCode = ({ children }: { children?: string | string[] }) => {
  const text = Array.isArray(children) ? children.join("") : String(children);

  return (
    <code className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-mono text-sm">
      {text}
    </code>
  );
};

/**
 * 图片组件 - 统一配置
 */
const ImageComponent = ({
  src,
  alt,
  width,
  height,
}: {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
}) => {
  const imgSrc = typeof src === "string" ? src : "";
  const imgWidth = width ? Number(width) : 800;
  const imgHeight = height ? Number(height) : 400;
  const imgAlt =
    alt || (imgSrc ? imgSrc.split("/").pop()?.split("?")[0] || "图片" : "图片");

  return (
    <div className="relative my-4">
      <CMSImage
        src={imgSrc}
        alt={imgAlt}
        width={imgWidth}
        height={imgHeight}
        className="rounded-lg shadow-sm object-contain w-full h-auto"
      />
    </div>
  );
};

/**
 * 链接组件 - 统一配置
 */
const LinkComponent = ({
  children,
  href,
}: {
  children?: React.ReactNode;
  href?: string;
}) => {
  const isExternal = href?.startsWith("http");

  return (
    <Link
      href={href || ""}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      presets={["hover-underline"]}
    >
      {children}
    </Link>
  );
};

/**
 * 表格组件 - 统一配置
 */
const TableComponent = ({ children }: { children?: React.ReactNode }) => (
  <div className="overflow-x-auto my-6">
    <table className="min-w-full border-collapse">{children}</table>
  </div>
);

/**
 * 统一的基础组件配置
 * 适用于 Markdown 和 MDX 两种模式
 */
const BASE_COMPONENTS = {
  // 代码处理
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  code: ({
    children,
    className,
  }: {
    children?: string | string[];
    className?: string;
  }) => {
    // 如果有 className (通常是 language-*), 说明是代码块
    if (className) {
      return <CodeBlock className={className}>{children as string}</CodeBlock>;
    }
    return <InlineCode>{children as string}</InlineCode>;
  },

  // 链接
  a: LinkComponent,

  // 图片
  img: ImageComponent,

  // 表格
  table: TableComponent,
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-foreground/5">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-foreground/10">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-2 text-left font-semibold border border-foreground/20">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-2 border border-foreground/20">{children}</td>
  ),

  // 其他元素（与 content.css 样式保持一致）
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="my-4 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside my-4 space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside my-4 space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="my-1">{children}</li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-4 border-foreground/20 pl-4 my-4 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="border-foreground/20 my-8" />,

  // MDX 特有元素（删除线、下划线、高亮、上下标）
  del: ({ children }: { children?: React.ReactNode }) => (
    <del className="line-through text-muted-foreground">{children}</del>
  ),
  u: ({ children }: { children?: React.ReactNode }) => (
    <u className="underline">{children}</u>
  ),
  mark: ({ children }: { children?: React.ReactNode }) => (
    <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
      {children}
    </mark>
  ),
  sup: ({ children }: { children?: React.ReactNode }) => (
    <sup className="text-xs align-super">{children}</sup>
  ),
  sub: ({ children }: { children?: React.ReactNode }) => (
    <sub className="text-xs align-sub">{children}</sub>
  ),
} as const;

/**
 * 获取 react-markdown 的组件配置
 */
export function getMarkdownComponents(): Components {
  return BASE_COMPONENTS as Components;
}

/**
 * 获取 MDX 的组件配置
 */
export function getMDXComponents(): MDXComponents {
  return BASE_COMPONENTS as MDXComponents;
}
