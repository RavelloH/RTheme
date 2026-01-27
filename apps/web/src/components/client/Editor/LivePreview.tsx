"use client";

import { Component, useEffect, useState, useRef } from "react";
import { hydrate } from "next-mdx-remote-client/csr";
import { serialize } from "next-mdx-remote-client/serialize";
import type { SerializeResult } from "next-mdx-remote-client/serialize";
import { AutoTransition } from "@/ui/AutoTransition";
import { RiAlertLine, RiRefreshLine } from "@remixicon/react";
import Clickable from "@/ui/Clickable";
import MarkdownClientRenderer from "../MarkdownClientRenderer";
import { useConfig } from "@/context/ConfigContext";
import { ConfigType } from "@/types/config";
import {
  cleanMDXSource,
  mdxSerializeOptions,
  createEnhancedMDXComponents,
} from "@/lib/shared/mdx-config";

export interface LivePreview {
  content: string;
  mode: "markdown" | "mdx";
  className?: string;
  onScroll?: (scrollTop: number, scrollHeight: number) => void;
}

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
          <div key="icon">
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

/**
 * MDX 编辑器预览组件
 *
 * 特性：
 * - 同时支持 Markdown 和 MDX 模式
 * - MDX 模式使用增强的组件配置（包含 ErrorBoundary）
 * - 实时编译和渲染
 * - 防抖优化（300ms）
 */
export function LivePreview({
  content,
  mode,
  className = "",
  onScroll,
}: LivePreview) {
  const shikiTheme = useConfig(
    "site.shiki.theme",
  ) as ConfigType<"site.shiki.theme">;

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
        const cleanedContent = cleanMDXSource(content);

        // 使用统一的 serialize 配置
        const result = await serialize({
          source: cleanedContent,
          options: mdxSerializeOptions,
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
    // Markdown 模式: 使用 MarkdownRenderer 渲染，传递 shikiTheme
    renderedContent = (
      <MDXErrorBoundary onReset={handleResetError}>
        <MarkdownClientRenderer source={content} shikiTheme={shikiTheme} />
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
          // 使用增强的组件配置（带 ErrorBoundary），传入 Shiki 主题
          const components = createEnhancedMDXComponents(
            withErrorBoundary,
            shikiTheme,
          );

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
