"use client";

import React, { useEffect, useState } from "react";
import { hydrate } from "next-mdx-remote-client/csr";
import type { SerializeResult } from "next-mdx-remote-client/serialize";
import { serialize } from "next-mdx-remote-client/serialize";

import { useConfig } from "@/context/ConfigContext";
import { useBroadcastSender } from "@/hooks/use-broadcast";
import {
  cleanMDXSource,
  createBaseMDXComponents,
  mdxSerializeOptions,
} from "@/lib/shared/mdx-config";
import type { MDXContentMessage } from "@/types/broadcast-messages";
import type { ConfigType } from "@/types/config";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

interface MDXClientRendererProps {
  /** MDX 源码 */
  source: string;
}

/**
 * 客户端 MDX 渲染器
 */
export default function MDXClientRenderer({ source }: MDXClientRendererProps) {
  // 从 ConfigProvider 获取 Shiki 主题配置
  const shikiTheme = useConfig(
    "site.shiki.theme",
  ) as ConfigType<"site.shiki.theme">;

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
        const cleanedContent = cleanMDXSource(source);

        // 使用统一的 serialize 配置
        const result = await serialize({
          source: cleanedContent,
          options: mdxSerializeOptions,
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
      broadcast({ type: "mdx-content-recheck" });
    }
  }, [isRendered, broadcast]);

  // 渲染错误状态
  if (mdxError) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-error/10">
        <h3 className="text-foreground font-semibold mb-2">MDX 编译错误</h3>
        <pre className="text-sm text-secondarywhitespace-pre-wrap">
          {mdxError.message}
        </pre>
      </div>
    );
  }

  // 加载状态
  if (!mdxSource) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 h-64 flex flex-col items-center text-muted-foreground">
        <LoadingIndicator />
        <span>正在编译 MDX 内容，请稍候...</span>
      </div>
    );
  }

  // 序列化错误
  if ("error" in mdxSource) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6 bg-error/10">
        <h3 className="text-foreground font-semibold mb-2">MDX 序列化错误</h3>
        <pre className="text-sm text-secondarywhitespace-pre-wrap ">
          {mdxSource.error.message}
        </pre>
      </div>
    );
  }

  // 水合渲染
  try {
    // 使用统一的组件配置，传入 Shiki 主题
    const components = createBaseMDXComponents(undefined, shikiTheme);

    const { content: hydratedContent, error: hydrateError } = hydrate({
      ...mdxSource,
      components,
    });

    if (hydrateError) {
      return (
        <div className="w-full max-w-4xl mx-auto p-6 bg-error/10">
          <h3 className="text-foreground font-semibold mb-2">MDX 水合错误</h3>
          <pre className="text-sm text-secondarywhitespace-pre-wrap">
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
      <div className="w-full max-w-4xl mx-auto p-6 bg-error/10">
        <h3 className="text-foreground font-semibold mb-2">MDX 渲染错误</h3>
        <pre className="text-sm text-secondarywhitespace-pre-wrap">
          {err instanceof Error ? err.message : "未知错误"}
        </pre>
      </div>
    );
  }
}
