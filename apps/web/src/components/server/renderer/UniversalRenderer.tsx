import React from "react";

import MDXClientRenderer from "@/components/client/renderer/MDXClientRenderer";
import HTMLServerRenderer from "@/components/server/renderer/HTMLServerRenderer";
import MarkdownServerRenderer from "@/components/server/renderer/MarkdownServerRenderer";
import type { MediaFileInfo } from "@/lib/shared/image-utils";
import type { ShikiTheme } from "@/lib/shared/mdx-config-shared";

interface UniversalRendererProps {
  source: string;
  mode: "markdown" | "mdx" | "html";
  mediaFileMap?: Map<string, MediaFileInfo>;
  /** 是否跳过渲染第一个 h1 标题（用于文章页面，因为封面已经显示了标题） */
  skipFirstH1?: boolean;
  /** Shiki 主题配置 */
  shikiTheme?: ShikiTheme;
}

/**
 * 移除 Markdown/MDX 内容中的第一个 h1 标题
 * 支持以下格式：
 * - ATX 风格: # 标题
 * - Setext 风格: 标题\n===
 */
function removeFirstH1(content: string): string {
  // 匹配 ATX 风格的 h1（# 开头）
  const atxH1Regex = /^#\s+.+$/m;
  // 匹配 Setext 风格的 h1（标题后跟 === 行）
  const setextH1Regex = /^.+\n=+$/m;

  // 检查哪种格式在前
  const atxMatch = content.match(atxH1Regex);
  const setextMatch = content.match(setextH1Regex);

  if (atxMatch && setextMatch) {
    // 两种都存在，移除位置靠前的那个
    if ((atxMatch.index ?? Infinity) < (setextMatch.index ?? Infinity)) {
      return content.replace(atxH1Regex, "");
    } else {
      return content.replace(setextH1Regex, "");
    }
  } else if (atxMatch) {
    return content.replace(atxH1Regex, "");
  } else if (setextMatch) {
    return content.replace(setextH1Regex, "");
  }

  return content;
}

/**
 * MDX/Markdown 统一渲染器
 */
export default async function UniversalRenderer({
  source,
  mode,
  mediaFileMap,
  skipFirstH1 = false,
  shikiTheme,
}: UniversalRendererProps) {
  // 如果需要跳过第一个 h1，在渲染前处理内容
  const processedSource =
    skipFirstH1 && mode !== "html" ? removeFirstH1(source) : source;

  if (mode === "mdx") {
    // MDX 模式：使用客户端渲染器（支持交互式组件）
    return <MDXClientRenderer source={processedSource} />;
  }

  if (mode === "html") {
    return <HTMLServerRenderer source={processedSource} />;
  }

  // Markdown 模式：使用服务端渲染器（SSR + Shiki 代码高亮）
  return (
    <MarkdownServerRenderer
      source={processedSource}
      mediaFileMap={mediaFileMap}
      shikiTheme={shikiTheme}
    />
  );
}
