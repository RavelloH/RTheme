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
      <pre className="shiki">
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

  return <code>{text}</code>;
};

/**
 * 图片组件 - 统一配置
 */
const ImageComponent = ({
  src,
  alt,
  width,
  height,
  ...props
}: {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const imgSrc = typeof src === "string" ? src : "";
  const imgWidth = width ? Number(width) : 800;
  const imgHeight = height ? Number(height) : 400;
  const imgAlt = alt || "";

  return (
    <div {...props}>
      <CMSImage src={imgSrc} alt={imgAlt} width={imgWidth} height={imgHeight} />
      <div className="text-center text-muted-foreground text-sm mb-2">
        {imgAlt}
      </div>
    </div>
  );
};

/**
 * 链接组件 - 统一配置
 */
const LinkComponent = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode;
  href?: string;
} & React.HTMLAttributes<HTMLAnchorElement>) => {
  const isExternal = href?.startsWith("http");

  return (
    <Link
      href={href || ""}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      presets={[
        "hover-underline",
        isExternal ? "arrow-out" : "arrow",
        isExternal ? "dynamic-icon" : "",
      ]}
      {...props}
    >
      {children}
    </Link>
  );
};

/**
 * 表格组件 - 统一配置
 */
const TableComponent = ({
  children,
  ...props
}: {
  children?: React.ReactNode;
} & React.TableHTMLAttributes<HTMLTableElement>) => (
  <table {...props}>{children}</table>
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
  thead: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead {...props}>{children}</thead>
  ),
  tbody: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLTableSectionElement>) => (
    <tbody {...props}>{children}</tbody>
  ),
  tr: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLTableRowElement>) => (
    <tr {...props}>{children}</tr>
  ),
  th: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.ThHTMLAttributes<HTMLTableHeaderCellElement>) => (
    <th {...props}>{children}</th>
  ),
  td: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.TdHTMLAttributes<HTMLTableDataCellElement>) => (
    <td {...props}>{children}</td>
  ),

  // 其他元素（样式由 content.css 处理）
  p: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props}>{children}</p>
  ),
  ul: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLUListElement>) => <ul {...props}>{children}</ul>,
  ol: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLOListElement>) => <ol {...props}>{children}</ol>,
  li: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.LiHTMLAttributes<HTMLLIElement>) => <li {...props}>{children}</li>,
  blockquote: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.BlockquoteHTMLAttributes<HTMLElement>) => (
    <blockquote {...props}>{children}</blockquote>
  ),
  hr: ({ ...props }: React.HTMLAttributes<HTMLHRElement>) => <hr {...props} />,

  // MDX 特有元素（样式由 content.css 处理）
  del: ({
    children,
    ...props
  }: { children?: React.ReactNode } & React.DelHTMLAttributes<HTMLElement>) => (
    <del {...props}>{children}</del>
  ),
  u: ({
    children,
    ...props
  }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => (
    <u {...props}>{children}</u>
  ),
  mark: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & React.HTMLAttributes<HTMLElement>) => <mark {...props}>{children}</mark>,
  sup: ({
    children,
    ...props
  }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => (
    <sup {...props}>{children}</sup>
  ),
  sub: ({
    children,
    ...props
  }: { children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) => (
    <sub {...props}>{children}</sub>
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
