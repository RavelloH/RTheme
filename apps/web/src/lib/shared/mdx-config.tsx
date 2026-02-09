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

import { useEffect, useState } from "react";
import {
  createContext,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect as reactUseEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState as reactUseState,
} from "react";
import type { Components } from "react-markdown";
import type { MDXComponents } from "next-mdx-remote-client/csr";
import { codeToHtml } from "shiki";

import CMSImage from "@/components/ui/CMSImage";
import Link from "@/components/ui/Link";
import {
  cleanMDXSource as cleanMDXSourceShared,
  createShikiConfig,
  mdxRehypePlugins,
  mdxRemarkPlugins,
  type ShikiTheme,
} from "@/lib/shared/mdx-config-shared";

// ============ 导出共享配置 ============
const MARKDOWN_IMAGE_SIZES = "(max-width: 56rem) 100vw, 56rem";

function parsePositiveDimension(value?: string | number): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  }
  return undefined;
}

/**
 * 统一的代码高亮函数
 *
 * @param code 代码内容
 * @param language 编程语言
 * @param shikiTheme 可选的 Shiki 主题配置
 * @returns 高亮后的 HTML
 */
export async function highlightCode(
  code: string,
  language: string,
  shikiTheme?: ShikiTheme,
): Promise<string> {
  try {
    const config = createShikiConfig(shikiTheme);
    return await codeToHtml(code, {
      lang: language,
      ...config,
    });
  } catch (err) {
    console.error("Shiki 语法高亮错误:", { error: err, language, code });
    // 如果指定的语言不支持，尝试用 text 语言重新渲染
    if (language !== "text") {
      try {
        const config = createShikiConfig(shikiTheme);
        return await codeToHtml(code, {
          lang: "text",
          ...config,
        });
      } catch (retryErr) {
        console.error("Shiki text 渲染失败:", { error: retryErr, code });
      }
    }
    // 最后的降级方案：返回纯文本
    const escapedCode = code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return `<pre class="p-4 rounded-lg overflow-x-auto my-4" style="background-color:#FFFFFF;--shiki-dark-bg:#1E1E1E;color:#000000;--shiki-dark:#D4D4D4"><code class="font-mono text-sm">${escapedCode}</code></pre>`;
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
  shikiTheme,
}: {
  children?: string;
  className?: string;
  shikiTheme?: ShikiTheme;
}) {
  const [html, setHtml] = useState("");
  const language = className?.replace(/language-/, "") || "text";
  const code = (children || "").replace(/\n$/, "");

  useEffect(() => {
    highlightCode(code, language, shikiTheme).then(setHtml);
  }, [code, language, shikiTheme]);

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
  const parsedWidth = parsePositiveDimension(width);
  const parsedHeight = parsePositiveDimension(height);
  const imgWidth = parsedWidth ?? 800;
  const imgHeight = parsedHeight ?? 400;
  const imageStyle =
    parsedWidth !== undefined
      ? { width: `min(100%, ${imgWidth}px)`, height: "auto" }
      : { width: "auto", maxWidth: "100%", height: "auto" };

  return (
    <span className="block">
      <CMSImage
        src={imgSrc}
        alt={imgAlt}
        width={imgWidth}
        height={imgHeight}
        sizes={MARKDOWN_IMAGE_SIZES}
        style={imageStyle}
        data-lightbox="true"
      />
      {imgAlt && (
        <span className="block text-center text-muted-foreground text-sm mb-2">
          {imgAlt}
        </span>
      )}
    </span>
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
 *
 * @param overrides 可选的组件覆盖
 * @param shikiTheme 可选的 Shiki 主题配置
 */
export function createBaseMDXComponents(
  overrides?: Partial<MDXComponents>,
  shikiTheme?: ShikiTheme,
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
        return (
          <CodeBlock className={className} shikiTheme={shikiTheme}>
            {children}
          </CodeBlock>
        );
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
/**
 * 创建增强的 MDX 组件配置
 *
 * @param errorBoundaryWrapper - 可选的 ErrorBoundary 包装器
 * @param shikiTheme - 可选的 Shiki 主题配置
 * @returns MDX 组件配置
 */
export function createEnhancedMDXComponents(
  errorBoundaryWrapper?: <P extends object>(
    component: React.ComponentType<P>,
    displayName: string,
  ) => React.ComponentType<P>,
  shikiTheme?: ShikiTheme,
): MDXComponents {
  const base = createBaseMDXComponents(undefined, shikiTheme);

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
        <mark>{children}</mark>
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
/**
 * 创建 Markdown 组件配置
 *
 * @param shikiTheme 可选的 Shiki 主题配置
 */
export function createMarkdownComponents(shikiTheme?: ShikiTheme): Components {
  return {
    // 代码处理
    pre: ({ children }: React.HTMLAttributes<HTMLPreElement>) => (
      <>{children}</>
    ),
    code: ({
      children,
      className,
      inline,
    }: {
      children?: string;
      className?: string;
      inline?: boolean;
    }) => {
      // 判断是否是行内代码
      // ReactMarkdown 的行为：
      // - 行内代码 `` `code` `` → inline=true, className=undefined
      // - 代码块 ```code``` → inline=false, 可能有 className
      const isInline = inline === true;

      if (isInline) {
        return (
          <code className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-mono text-sm">
            {children}
          </code>
        );
      }

      // 否则是代码块（即使没有 className，也使用 text 作为默认语言）
      return (
        <CodeBlock
          className={className || "language-text"}
          shikiTheme={shikiTheme}
        >
          {children}
        </CodeBlock>
      );
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
