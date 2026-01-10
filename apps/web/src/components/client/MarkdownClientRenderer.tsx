"use client";

import React from "react";
import Markdown from "react-markdown";
import { createMarkdownComponents } from "@/lib/shared/mdx-config";
import {
  markdownRemarkPlugins,
  markdownRehypePlugins,
} from "@/lib/shared/mdx-config-shared";

interface MarkdownRendererProps {
  source: string;
  className?: string;
}

/**
 * 客户端 Markdown 渲染器
 */
export default function MarkdownClientRenderer({
  source,
  className = "max-w-4xl mx-auto md-content",
}: MarkdownRendererProps) {
  const markdownComponents = createMarkdownComponents();

  return (
    <div className={className}>
      <Markdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
        components={markdownComponents}
      >
        {source}
      </Markdown>
    </div>
  );
}
