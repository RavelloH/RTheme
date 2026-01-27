import "server-only";

import React from "react";
import Markdown from "react-markdown";
import { createServerMarkdownComponents } from "@/lib/server/mdx-config-server";
import {
  markdownRemarkPlugins,
  markdownRehypePlugins,
  type ShikiTheme,
} from "@/lib/shared/mdx-config-shared";
import type { MediaFileInfo } from "@/lib/shared/image-utils";

interface MarkdownServerRendererProps {
  source: string;
  className?: string;
  mediaFileMap?: Map<string, MediaFileInfo>;
  shikiTheme?: ShikiTheme;
}

/**
 * 服务端 Markdown 渲染器
 * 使用服务端 Shiki 代码高亮，提升首屏性能和 SEO
 */
export default async function MarkdownServerRenderer({
  source,
  className = "max-w-4xl mx-auto md-content",
  mediaFileMap,
  shikiTheme,
}: MarkdownServerRendererProps) {
  // 使用统一的服务器端组件配置，传入主题
  const components = createServerMarkdownComponents(mediaFileMap, shikiTheme);

  return (
    <div className={className}>
      <Markdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={components}
      >
        {source}
      </Markdown>
    </div>
  );
}
