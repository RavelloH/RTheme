import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import { getMarkdownComponents } from "@/components/server/renderAdapter";
import { MediaFileInfo } from "@/lib/shared/image-utils";
import MDXClientRenderer from "@/components/client/MDXClientRenderer";

interface MDXRendererProps {
  source: string;
  mode: "markdown" | "mdx";
  mediaFileMap?: Map<string, MediaFileInfo>;
  /** 是否跳过渲染第一个 h1 标题（用于文章页面，因为封面已经显示了标题） */
  skipFirstH1?: boolean;
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
 * MDX/Markdown 统一渲染器（服务端组件）
 *
 * - Markdown 模式：在服务端使用 react-markdown 渲染
 * - MDX 模式：委托给客户端组件 MDXClientRenderer 处理交互
 */
export default function MDXRenderer({
  source,
  mode,
  mediaFileMap,
  skipFirstH1 = false,
}: MDXRendererProps) {
  // 如果需要跳过第一个 h1，在渲染前处理内容
  const processedSource = skipFirstH1 ? removeFirstH1(source) : source;

  if (mode === "mdx") {
    // MDX 模式：使用客户端渲染器（支持交互式组件）
    return <MDXClientRenderer source={processedSource} />;
  }

  // Markdown 模式：使用 react-markdown 渲染（服务端）
  return (
    <div className="w-full max-w-4xl mx-auto md-content">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeSlug, rehypeRaw]}
        components={getMarkdownComponents(mediaFileMap)}
      >
        {processedSource}
      </Markdown>
    </div>
  );
}
