/**
 * 客户端 MDX/Markdown 渲染配置
 * 解决全站渲染逻辑代码重复问题
 *
 * 架构说明：
 * - 客户端渲染，支持交互式 MDX 组件
 * - 使用 Shiki 进行客户端代码语法高亮
 * - 统一的组件配置，避免代码重复
 *
 * 使用场景：
 * 1. MDXClientRenderer - 文章详情页 MDX 渲染
 * 2. MDXPreview - 编辑器预览（Markdown + MDX）
 * 3. MarkdownRenderer - 客户端 Markdown 渲染
 */

"use client";

import { useState, useEffect } from "react";
import { codeToHtml } from "shiki";
import type { MDXComponents } from "next-mdx-remote-client/csr";
import type { Components } from "react-markdown";
import Link from "@/components/Link";
import CMSImage from "@/components/CMSImage";
import {
  shikiConfig,
  cleanMDXSource as cleanMDXSourceShared,
  mdxRemarkPlugins,
  mdxRehypePlugins,
} from "@/lib/shared/mdx-config-shared";
import {
  useState as reactUseState,
  useEffect as reactUseEffect,
  useRef,
  useMemo,
  useCallback,
  useContext,
  useReducer,
  useLayoutEffect,
  useImperativeHandle,
  createContext,
  forwardRef,
  memo,
} from "react";

// ============ 导出共享配置 ============

/**
 * 导出 Shiki 配置（从共享模块）
 */
export { shikiConfig };

/**
 * 统一的代码高亮函数
 */
export async function highlightCode(
  code: string,
  language: string,
): Promise<string> {
  try {
    return await codeToHtml(code, {
      lang: language,
      ...shikiConfig,
    });
  } catch (err) {
    console.error("Shiki 语法高亮错误:", { error: err, language });
    return `<pre class="shiki"><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
  }
}

// ============ MDX Scope 配置 ============

/**
 * 统一的 React Hooks Scope（供 MDX 中的 export function 使用）
 */
export const mdxScope = {
  useState: reactUseState,
  useEffect: reactUseEffect,
  useRef,
  useMemo,
  useCallback,
  useContext,
  useReducer,
  useLayoutEffect,
  useImperativeHandle,
  createContext,
  forwardRef,
  memo,
} as const;

// ============ MDX Serialize 配置 ============

/**
 * 统一的 MDX serialize 配置
 */
export const mdxSerializeOptions = {
  mdxOptions: {
    format: "mdx" as const,
    development: false,
    remarkPlugins: mdxRemarkPlugins,
    rehypePlugins: mdxRehypePlugins,
  },
  parseFrontmatter: true,
  scope: mdxScope,
};

/**
 * 导出清理 MDX 源码函数（从共享模块）
 */
export const cleanMDXSource = cleanMDXSourceShared;

// ============ 共享组件 ============

/**
 * 行内代码组件
 */
export function InlineCode({ children }: { children?: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-mono text-sm">
      {children}
    </code>
  );
}

/**
 * 代码块组件（使用 Shiki 高亮）
 */
export function CodeBlock({
  children,
  className,
}: {
  children?: string;
  className?: string;
}) {
  const [html, setHtml] = useState("");
  const language = className?.replace(/language-/, "") || "text";
  const code = String(children).replace(/\n$/, "");

  useEffect(() => {
    highlightCode(code, language).then(setHtml);
  }, [code, language]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

/**
 * 图片组件（客户端版本）
 */
export function ImageComponent({
  src,
  alt,
  width,
  height,
}: {
  src?: string;
  alt?: string;
  width?: string | number;
  height?: string | number;
}) {
  const imgSrc = typeof src === "string" ? src : "";
  const imgAlt = alt || "";
  const imgWidth = width ? Number(width) : 800;
  const imgHeight = height ? Number(height) : 400;

  return (
    <div>
      <CMSImage
        src={imgSrc}
        alt={imgAlt}
        width={imgWidth}
        height={imgHeight}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        data-lightbox="true"
      />
      <div className="text-center text-muted-foreground text-sm mb-2">
        {imgAlt}
      </div>
    </div>
  );
}

/**
 * 链接组件
 */
export function LinkComponent({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode;
  href?: string;
} & React.HTMLAttributes<HTMLAnchorElement>) {
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
}

// ============ 组件配置工厂函数 ============

/**
 * 创建基础的 MDX 组件配置
 * 适用于 MDXClientRenderer 和 MDXPreview
 */
export function createBaseMDXComponents(
  overrides?: Partial<MDXComponents>,
): MDXComponents {
  return {
    // 代码处理
    pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    code: ({
      children,
      className,
    }: {
      children?: string;
      className?: string;
    }) => {
      if (className) {
        return <CodeBlock className={className}>{children}</CodeBlock>;
      }
      return <InlineCode>{children}</InlineCode>;
    },

    // 链接
    a: LinkComponent,

    // 图片
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const { src, alt, width, height } = props;
      return (
        <ImageComponent
          src={typeof src === "string" ? src : undefined}
          alt={alt}
          width={width}
          height={height}
        />
      );
    },

    // 表格
    table: ({ children, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
      <div className="overflow-x-auto my-6">
        <table {...props}>{children}</table>
      </div>
    ),

    // 允许通过 overrides 扩展或覆盖
    ...overrides,
  } as MDXComponents;
}

/**
 * 创建增强的 MDX 组件配置（用于编辑器预览）
 * 包含更详细的表格样式和扩展元素
 */
export function createEnhancedMDXComponents(
  errorBoundaryWrapper?: <P extends object>(
    component: React.ComponentType<P>,
    displayName: string,
  ) => React.ComponentType<P>,
): MDXComponents {
  const base = createBaseMDXComponents();

  // 如果提供了 ErrorBoundary 包装器，使用它
  const wrap =
    errorBoundaryWrapper ||
    (<P extends object>(comp: React.ComponentType<P>) => comp);

  return {
    ...base,

    // 覆盖基础组件，添加 ErrorBoundary
    pre: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"pre">) => <>{children}</>,
      "pre",
    ),
    code: wrap(
      ({ children, className }: { children?: string; className?: string }) => {
        if (className) {
          return <CodeBlock className={className}>{children}</CodeBlock>;
        }
        return <InlineCode>{children}</InlineCode>;
      },
      "code",
    ),

    // 增强的表格样式
    table: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"table">) => (
        <div className="overflow-x-auto my-6">
          <table className="min-w-full border-collapse">{children}</table>
        </div>
      ),
      "table",
    ),
    thead: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"thead">) => (
        <thead className="bg-foreground/5">{children}</thead>
      ),
      "thead",
    ),
    tbody: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"tbody">) => (
        <tbody>{children}</tbody>
      ),
      "tbody",
    ),
    tr: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"tr">) => (
        <tr className="border-b border-foreground/10">{children}</tr>
      ),
      "tr",
    ),
    th: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"th">) => (
        <th className="px-4 py-2 text-left font-semibold border border-foreground/20">
          {children}
        </th>
      ),
      "th",
    ),
    td: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"td">) => (
        <td className="px-4 py-2 border border-foreground/20">{children}</td>
      ),
      "td",
    ),

    // 扩展元素
    del: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"del">) => (
        <del className="line-through text-muted-foreground">{children}</del>
      ),
      "del",
    ),
    u: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"u">) => (
        <u className="underline">{children}</u>
      ),
      "u",
    ),
    mark: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"mark">) => (
        <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {children}
        </mark>
      ),
      "mark",
    ),
    sup: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"sup">) => (
        <sup className="text-xs align-super">{children}</sup>
      ),
      "sup",
    ),
    sub: wrap(
      ({ children }: React.ComponentPropsWithoutRef<"sub">) => (
        <sub className="text-xs align-sub">{children}</sub>
      ),
      "sub",
    ),
    p: wrap(
      ({ children, style }: React.ComponentPropsWithoutRef<"p">) => (
        <p style={style} className="my-4 leading-relaxed">
          {children}
        </p>
      ),
      "p",
    ),
    div: wrap(
      ({ children, style }: React.ComponentPropsWithoutRef<"div">) => (
        <div style={style}>{children}</div>
      ),
      "div",
    ),
  } as MDXComponents;
}

/**
 * 创建 react-markdown 的组件配置
 * 适用于 MarkdownRenderer
 */
export function createMarkdownComponents(): Components {
  return {
    // 代码处理
    pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => (
      <>{children}</>
    ),
    code: (props: React.HTMLAttributes<HTMLElement>) => {
      const { children, className } = props;

      if (className) {
        return (
          <CodeBlock className={className as string}>
            {children as string}
          </CodeBlock>
        );
      }

      return <code {...props}>{children}</code>;
    },

    // 链接
    a: ({
      children,
      href,
      ...rest
    }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
      return (
        <Link href={href || ""} {...rest} presets={["hover-underline"]}>
          {children}
        </Link>
      );
    },

    // 图片
    img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
      const { src, alt, width, height } = props;
      return (
        <ImageComponent
          src={typeof src === "string" ? src : undefined}
          alt={alt}
          width={width}
          height={height}
        />
      );
    },

    // 表格容器 - 添加横向滚动
    table: ({ children, ...rest }: React.HTMLAttributes<HTMLTableElement>) => (
      <div className="overflow-x-auto my-6">
        <table {...rest}>{children}</table>
      </div>
    ),
  } as Components;
}
