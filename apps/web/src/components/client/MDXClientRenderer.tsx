"use client";

import React, { useState, useEffect } from "react";
import { hydrate } from "next-mdx-remote-client/csr";
import { serialize } from "next-mdx-remote-client/serialize";
import type { SerializeResult } from "next-mdx-remote-client/serialize";
import type { MDXComponents } from "next-mdx-remote-client/csr";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
// 注入 React Hooks 和工具函数到 MDX scope
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
import { codeToHtml } from "shiki";
import Link from "@/components/Link";
import CMSImage from "@/components/CMSImage";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import type { MDXContentMessage } from "@/types/broadcast-messages";

interface MDXClientRendererProps {
  /** MDX 源码 */
  source: string;
}

/**
 * 代码块组件（使用 Shiki 高亮）- 客户端版本
 */
const CodeBlock = ({
  children,
  className,
}: {
  children?: string;
  className?: string;
}) => {
  const [html, setHtml] = useState("");
  const language = className?.replace(/language-/, "") || "text";

  useEffect(() => {
    const code = String(children).replace(/\n$/, "");

    codeToHtml(code, {
      lang: language,
      themes: {
        light: "light-plus",
        dark: "dark-plus",
      },
    })
      .then((highlighted) => {
        setHtml(highlighted);
      })
      .catch((err) => {
        console.error("Shiki highlighting error:", err);
        setHtml(
          `<pre class="shiki"><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
        );
      });
  }, [children, language]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

/**
 * 行内代码组件
 */
const InlineCode = ({ children }: { children?: string }) => {
  return (
    <code className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-mono text-sm">
      {children}
    </code>
  );
};

/**
 * 图片组件 - 客户端简化版本
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
};

/**
 * 链接组件
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
 * 创建客户端 MDX 组件配置
 */
const components: MDXComponents = {
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
};

/**
 * 纯客户端的 MDX 渲染器
 * 不依赖任何服务端模块（如 prisma、image-utils 等）
 */
export default function MDXClientRenderer({ source }: MDXClientRendererProps) {
  const [mdxSource, setMdxSource] = useState<SerializeResult<
    Record<string, unknown>,
    Record<string, unknown>
  > | null>(null);
  const [mdxError, setMdxError] = useState<Error | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const { broadcast } = useBroadcastSender<MDXContentMessage>();

  // 编译 MDX
  useEffect(() => {
    const compileMdx = async () => {
      try {
        setMdxError(null);
        setIsRendered(false);

        // 移除 import 语句（CSR 不支持）
        const cleanedContent = source.replace(
          /^import\s+.*?\s+from\s+['"].*?['"]\s*;?\s*$/gm,
          "",
        );

        const result = await serialize({
          source: cleanedContent,
          options: {
            mdxOptions: {
              format: "mdx",
              development: false,
              remarkPlugins: [remarkGfm],
              rehypePlugins: [rehypeSlug],
            },
            parseFrontmatter: true,
            // 注入 React Hooks 到 scope，让 MDX 中的 export function 可以使用
            scope: {
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
            },
          },
        });

        setMdxSource(result);
      } catch (err) {
        console.error("MDX compilation error:", err);
        setMdxError(err instanceof Error ? err : new Error("编译失败"));
      }
    };

    compileMdx();
  }, [source]);

  // 在渲染完成后触发广播，通知 PostToc 和 ImageLightbox 重新扫描
  useEffect(() => {
    if (isRendered) {
      // 触发广播事件，通知其他组件内容已渲染
      broadcast({ type: "mdx-content-rendered" });

      // 稍微延迟一下确保 DOM 更新完成
      setTimeout(() => {
        broadcast({ type: "mdx-content-recheck" });
      }, 100);
    }
  }, [isRendered, broadcast]);

  // 渲染错误状态
  if (mdxError) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
        <h3 className="text-red-900 dark:text-red-100 font-semibold mb-2">
          MDX 编译错误
        </h3>
        <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
          {mdxError.message}
        </pre>
      </div>
    );
  }

  // 加载状态
  if (!mdxSource) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 text-muted-foreground">
        加载中...
      </div>
    );
  }

  // 序列化错误
  if ("error" in mdxSource) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
        <h3 className="text-red-900 dark:text-red-100 font-semibold mb-2">
          MDX 序列化错误
        </h3>
        <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
          {mdxSource.error.message}
        </pre>
      </div>
    );
  }

  // 水合渲染
  try {
    const { content: hydratedContent, error: hydrateError } = hydrate({
      ...mdxSource,
      components,
    });

    if (hydrateError) {
      return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
          <h3 className="text-red-900 dark:text-red-100 font-semibold mb-2">
            MDX 水合错误
          </h3>
          <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
            {hydrateError.message}
          </pre>
        </div>
      );
    }

    // 渲染成功后标记为已渲染
    if (!isRendered) {
      // 使用微任务延迟设置，确保 DOM 已更新
      Promise.resolve().then(() => setIsRendered(true));
    }

    return (
      <div
        className="w-full max-w-4xl mx-auto md-content"
        data-mdx-rendered={isRendered ? "true" : "false"}
      >
        {hydratedContent}
      </div>
    );
  } catch (err) {
    console.error("Hydrate error:", err);
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
        <h3 className="text-red-900 dark:text-red-100 font-semibold mb-2">
          渲染错误
        </h3>
        <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
          {err instanceof Error ? err.message : "未知错误"}
        </pre>
      </div>
    );
  }
}
