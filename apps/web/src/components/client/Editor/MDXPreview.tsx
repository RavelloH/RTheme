"use client";

import {
  Component,
  useEffect,
  useState,
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
import { hydrate } from "next-mdx-remote-client/csr";
import { serialize } from "next-mdx-remote-client/serialize";
import type { SerializeResult } from "next-mdx-remote-client/serialize";
import type { MDXComponents } from "next-mdx-remote-client/csr";
import { codeToHtml } from "shiki";
import remarkGfm from "remark-gfm";
import { AutoTransition } from "@/ui/AutoTransition";
import { RiAlertLine, RiRefreshLine } from "@remixicon/react";
import Clickable from "@/ui/Clickable";
import MarkdownRenderer from "../MarkdownRenderer";

export interface MDXPreviewProps {
  content: string;
  mode: "markdown" | "mdx";
  className?: string;
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
}

interface CodeBlockProps {
  children?: React.ReactNode;
  className?: string;
}

// 行内代码组件
const InlineCode = ({ children }: { children?: React.ReactNode }) => {
  return (
    <code className="px-1.5 py-0.5 rounded bg-foreground/10 text-foreground font-mono text-sm">
      {children}
    </code>
  );
};

// 自定义代码块组件,使用 Shiki 高亮
const CodeBlock = ({ children, className }: CodeBlockProps) => {
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
        // 回退到普通代码块
        setHtml(
          `<pre class="shiki"><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`,
        );
      });
  }, [children, language]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

// 包裹组件的 Error Boundary 高阶组件
function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  displayName: string,
): React.ComponentType<P> {
  const ComponentWithErrorBoundary = (props: P) => (
    <MDXErrorBoundary>
      <WrappedComponent {...props} />
    </MDXErrorBoundary>
  );

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;
  return ComponentWithErrorBoundary;
}

// MDX 组件映射
const components: MDXComponents = {
  // 处理代码块: pre > code 结构
  pre: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"pre">) => <>{children}</>,
    "pre",
  ),
  code: withErrorBoundary(({ children, className }: CodeBlockProps) => {
    // 如果有 className (通常是 language-*), 说明是代码块
    // 如果没有 className, 说明是行内代码
    if (className) {
      return <CodeBlock className={className}>{children}</CodeBlock>;
    }
    return <InlineCode>{children}</InlineCode>;
  }, "code"),
  // 表格元素
  table: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"table">) => (
      <div className="overflow-x-auto my-6">
        <table className="min-w-full border-collapse">{children}</table>
      </div>
    ),
    "table",
  ),
  thead: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"thead">) => (
      <thead className="bg-foreground/5">{children}</thead>
    ),
    "thead",
  ),
  tbody: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"tbody">) => (
      <tbody>{children}</tbody>
    ),
    "tbody",
  ),
  tr: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"tr">) => (
      <tr className="border-b border-foreground/10">{children}</tr>
    ),
    "tr",
  ),
  th: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"th">) => (
      <th className="px-4 py-2 text-left font-semibold border border-foreground/20">
        {children}
      </th>
    ),
    "th",
  ),
  td: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"td">) => (
      <td className="px-4 py-2 border border-foreground/20">{children}</td>
    ),
    "td",
  ),
  // 删除线
  del: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"del">) => (
      <del className="line-through text-muted-foreground">{children}</del>
    ),
    "del",
  ),
  // 下划线
  u: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"u">) => (
      <u className="underline">{children}</u>
    ),
    "u",
  ),
  // 高亮标记
  mark: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"mark">) => (
      <mark className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
        {children}
      </mark>
    ),
    "mark",
  ),
  // 上标
  sup: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"sup">) => (
      <sup className="text-xs align-super">{children}</sup>
    ),
    "sup",
  ),
  // 下标
  sub: withErrorBoundary(
    ({ children }: React.ComponentPropsWithoutRef<"sub">) => (
      <sub className="text-xs align-sub">{children}</sub>
    ),
    "sub",
  ),
  // 段落 - 支持自定义样式（如文本对齐）
  p: withErrorBoundary(
    ({ children, style }: React.ComponentPropsWithoutRef<"p">) => (
      <p style={style} className="my-4 leading-relaxed">
        {children}
      </p>
    ),
    "p",
  ),
  // div - 支持自定义样式
  div: withErrorBoundary(
    ({ children, style }: React.ComponentPropsWithoutRef<"div">) => (
      <div style={style}>{children}</div>
    ),
    "div",
  ),
};

// 错误显示组件
function RenderError({
  error,
  onReset,
}: {
  error: Error;
  onReset?: () => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center text-muted-foreground p-4"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <AutoTransition type="scale">
        {hover && onReset ? (
          <Clickable key="refresh" onClick={onReset}>
            <RiRefreshLine size={"3em"} />
          </Clickable>
        ) : (
          <div className="inline-block" key="icon">
            <RiAlertLine size={"3em"} />
          </div>
        )}
      </AutoTransition>
      <div className="text-xl mt-4 mb-2 font-semibold">渲染错误</div>
      <pre className="text-sm text-muted-foreground/70 whitespace-pre-wrap max-w-2xl text-center">
        {error.message}
      </pre>
    </div>
  );
}

// Error Boundary 组件
class MDXErrorBoundary extends Component<
  {
    children: React.ReactNode;
    onReset?: () => void;
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onReset?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("MDX Error Boundary caught an error:", error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return <RenderError error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

export function MDXPreview({
  content,
  mode,
  className = "",
  onScroll,
}: MDXPreviewProps) {
  // MDX 模式状态
  const [mdxSource, setMdxSource] = useState<SerializeResult<
    Record<string, unknown>,
    Record<string, unknown>
  > | null>(null);

  const [renderError, setRenderError] = useState<Error | null>(null);
  const [retryKey, setRetryKey] = useState(0); // 用于触发重试
  const containerRef = useRef<HTMLDivElement>(null);

  // 重置错误状态
  const handleResetError = () => {
    setRenderError(null);
    setMdxSource(null);
    setRetryKey((prev) => prev + 1); // 触发重新渲染
  };

  // MDX 模式渲染
  useEffect(() => {
    if (mode !== "mdx") return;

    const compileMdx = async () => {
      try {
        setRenderError(null);

        // 移除 MDX 中的 import 语句,因为 CSR 不支持
        const cleanedContent = content.replace(
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
            },
            parseFrontmatter: true,
            scope: {
              // React Hooks
              useState,
              useEffect,
              useRef,
              useMemo,
              useCallback,
              useContext,
              useReducer,
              useLayoutEffect,
              useImperativeHandle,
              // React 工具函数
              createContext,
              forwardRef,
              memo,
            },
          },
        });

        setMdxSource(result);
      } catch (err) {
        console.error("MDX compilation error:", err);
        const errorMessage = err instanceof Error ? err.message : "编译失败";
        setRenderError(new Error(errorMessage));
      }
    };

    const timeoutId = setTimeout(compileMdx, 300);
    return () => clearTimeout(timeoutId);
  }, [content, mode, retryKey]);

  // 监听滚动事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onScroll) return;

    const handleScroll = () => {
      onScroll(container.scrollTop, container.scrollHeight);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [onScroll]);

  // 渲染内容
  let renderedContent: React.JSX.Element | null = null;

  if (renderError) {
    renderedContent = (
      <RenderError error={renderError} onReset={handleResetError} />
    );
  } else if (mode === "markdown") {
    // Markdown 模式: 使用 MarkdownRenderer 渲染
    renderedContent = (
      <MDXErrorBoundary onReset={handleResetError}>
        <MarkdownRenderer source={content} />
      </MDXErrorBoundary>
    );
  } else {
    // MDX 模式: 使用 hydrate 渲染
    if (mdxSource) {
      if ("error" in mdxSource) {
        renderedContent = (
          <RenderError error={mdxSource.error} onReset={handleResetError} />
        );
      } else {
        try {
          const { content: hydratedContent, error: hydrateError } = hydrate({
            ...mdxSource,
            components,
          });

          if (hydrateError) {
            renderedContent = (
              <RenderError error={hydrateError} onReset={handleResetError} />
            );
          } else {
            renderedContent = (
              <MDXErrorBoundary onReset={handleResetError}>
                <div className="max-w-4xl mx-auto">{hydratedContent}</div>
              </MDXErrorBoundary>
            );
          }
        } catch (err) {
          console.error("Hydrate error:", err);
          const errorMessage = err instanceof Error ? err.message : "水合失败";
          renderedContent = (
            <RenderError
              error={new Error(errorMessage)}
              onReset={handleResetError}
            />
          );
        }
      }
    } else {
      renderedContent = <div className="text-foreground/50">加载中...</div>;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`md-content h-full overflow-auto px-6 py-8 ${className}`}
    >
      {renderedContent}
    </div>
  );
}
