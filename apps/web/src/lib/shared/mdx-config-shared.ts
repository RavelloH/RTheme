/**
 * MDX/Markdown 共享配置（无客户端/服务器端限制）
 *
 * 此文件包含可以在客户端和服务器端共享的配置
 * - Shiki 配置
 * - Remark/Rehype 插件配置
 * - 常量和类型定义
 */

import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// ============ Shiki 配置 ============

/**
 * Shiki 主题类型
 */
export interface ShikiTheme {
  light: string;
  dark: string;
}

/**
 * 默认 Shiki 主题配置（降级方案）
 */
export const defaultShikiTheme: ShikiTheme = {
  light: "light-plus",
  dark: "dark-plus",
};

/**
 * 创建 Shiki 配置对象
 *
 * @param theme 可选的主题配置，如果不提供则使用默认主题
 * @returns Shiki 配置对象
 *
 * @example
 * // 使用默认主题
 * const config = createShikiConfig();
 *
 * // 使用自定义主题
 * const config = createShikiConfig({ light: "github-light", dark: "github-dark" });
 */
export function createShikiConfig(theme?: ShikiTheme) {
  const selectedTheme = theme || defaultShikiTheme;
  return {
    themes: {
      light: selectedTheme.light,
      dark: selectedTheme.dark,
    },
  } as const;
}

/**
 * 统一的 Shiki 主题配置（向后兼容，使用默认主题）
 * @deprecated 建议使用 createShikiConfig() 或从配置中获取主题
 */
export const shikiConfig = createShikiConfig();

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
