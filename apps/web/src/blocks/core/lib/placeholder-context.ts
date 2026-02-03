import type { ParsedPlaceholder } from "@/blocks/core/lib/shared";

/**
 * 上下文数据类型
 */
export interface ContextData {
  slug?: string;
  page?: number;
  url?: string;
  [key: string]: unknown;
}

/**
 * 为占位符自动附加上下文参数
 *
 * 规则：
 * - {xxx} 会被转换为 {xxx|slug=xxx&page=xxx&url=xxx}
 * - {xxx|abc=xyz} 会被转换为 {xxx|abc=xyz&slug=xxx&page=xxx&url=xxx}
 * - 如果占位符已经有某个参数，则不会覆盖
 *
 * @param placeholder - 解析后的占位符对象
 * @param contextData - 上下文数据
 * @returns 附加了上下文参数的占位符字符串
 */
export function attachContextToPlaceholder(
  placeholder: ParsedPlaceholder,
  contextData: ContextData,
): string {
  const { name, params } = placeholder;

  // 默认附加的上下文参数
  const defaultContextParams: Record<string, string> = {};

  // 附加 slug（如果存在且未指定）
  if (contextData.slug && !params.slug) {
    defaultContextParams.slug = contextData.slug;
  }

  // 附加 page（如果存在且未指定）
  if (contextData.page && !params.page) {
    defaultContextParams.page = String(contextData.page);
  }

  // 附加 url（如果存在且未指定）
  if (contextData.url && !params.url) {
    defaultContextParams.url = contextData.url;
  }

  // 合并用户指定的参数和默认参数（用户指定的优先）
  const allParams = { ...defaultContextParams, ...params };

  // 如果没有参数，返回原占位符
  if (Object.keys(allParams).length === 0) {
    return `{${name}}`;
  }

  // 构建参数字符串
  const paramStr = Object.entries(allParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `{${name}|${paramStr}}`;
}

/**
 * 批量为占位符附加上下文参数
 *
 * @param placeholders - 解析后的占位符数组
 * @param contextData - 上下文数据
 * @returns 附加了上下文参数的占位符字符串数组
 */
export function attachContextToPlaceholders(
  placeholders: ParsedPlaceholder[],
  contextData: ContextData,
): string[] {
  return placeholders.map((p) => attachContextToPlaceholder(p, contextData));
}
