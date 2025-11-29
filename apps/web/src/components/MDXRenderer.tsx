import { MDXRemote } from "next-mdx-remote-client/rsc";
import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";
import {
  getMarkdownComponents,
  getMDXComponents,
} from "@/components/server/renderAdapter";
import { MediaFileInfo } from "@/lib/shared/imageUtils";

interface MDXRendererProps {
  source: string;
  mode: "markdown" | "mdx";
  mediaFileMap?: Map<string, MediaFileInfo>;
}

export default function MDXRenderer({
  source,
  mode,
  mediaFileMap,
}: MDXRendererProps) {
  if (mode === "mdx") {
    // MDX 模式：使用 next-mdx-remote 渲染
    return (
      <div className="max-w-4xl mx-auto">
        <MDXRemote
          source={source}
          components={getMDXComponents(mediaFileMap)}
        />
      </div>
    );
  }

  // Markdown 模式：使用 react-markdown 渲染
  return (
    <div className="max-w-4xl mx-auto md-content">
      <Markdown
        remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
        rehypePlugins={[rehypeKatex, rehypeSlug, rehypeRaw]}
        components={getMarkdownComponents(mediaFileMap)}
      >
        {source}
      </Markdown>
    </div>
  );
}
