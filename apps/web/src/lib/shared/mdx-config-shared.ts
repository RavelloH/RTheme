/**
 * MDX/Markdown 共享配置（无客户端/服务器端限制）
 *
 * 此文件包含可以在客户端和服务器端共享的配置
 * - Shiki 配置
 * - Remark/Rehype 插件配置
 * - 常量和类型定义
 */

import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import rehypeRaw from "rehype-raw";

// ============ Shiki 配置 ============

/**
 * 统一的 Shiki 主题配置
 * 可在客户端和服务器端使用
 */
export const shikiConfig = {
  themes: {
    light: "light-plus",
    dark: "dark-plus",
  },
} as const;

// ============ Remark/Rehype 插件配置 ============

/**
 * Markdown 渲染的 remark 插件列表
 */
export const markdownRemarkPlugins = [remarkGfm, remarkMath, remarkBreaks];

/**
 * Markdown 渲染的 rehype 插件列表
 */
export const markdownRehypePlugins = [rehypeKatex, rehypeSlug, rehypeRaw];

/**
 * MDX 渲染的 remark 插件列表
 * 包含 remarkMath 以支持数学公式
 */
export const mdxRemarkPlugins = [remarkGfm, remarkMath];

/**
 * MDX 渲染的 rehype 插件列表
 * 包含 rehypeKatex 以渲染 LaTeX 数学公式
 */
export const mdxRehypePlugins = [rehypeKatex, rehypeSlug];

// ============ 工具函数 ============

/**
 * 移除 MDX 中的 import 语句（CSR 不支持）
 */
export function cleanMDXSource(source: string): string {
  return source.replace(/^import\s+.*?\s+from\s+['"].*?['"]\s*;?\s*$/gm, "");
}
