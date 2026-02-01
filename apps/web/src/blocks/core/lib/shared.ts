/**
 * 提取文本中的所有占位符
 */
export function extractPlaceholders(text: string): string[] {
  if (!text) return [];
  const placeholderRegex = /\{(\w+)\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = placeholderRegex.exec(text)) !== null) {
    if (match[1]) placeholders.add(match[1]);
  }
  return Array.from(placeholders);
}

/**
 * 递归提取对象中所有字符串值的占位符
 */
export function extractPlaceholdersFromValue(value: unknown): string[] {
  const placeholders = new Set<string>();
  if (typeof value === "string") {
    extractPlaceholders(value).forEach((p) => placeholders.add(p));
  } else if (Array.isArray(value)) {
    value.forEach((item) => {
      extractPlaceholdersFromValue(item).forEach((p) => placeholders.add(p));
    });
  } else if (typeof value === "object" && value !== null) {
    Object.values(value).forEach((item) => {
      extractPlaceholdersFromValue(item).forEach((p) => placeholders.add(p));
    });
  }
  return Array.from(placeholders);
}

/**
 * 替换文本中的占位符
 */
export function replacePlaceholders(
  text: string,
  data: Record<string, unknown>,
): string {
  if (!text) return "";
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    if (!data) return match;
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * 从 BlockContent 类型的值中提取文本
 */
export function extractBlockText(
  value: { value: string | string[]; align?: string } | undefined | null,
): string {
  if (!value) return "";
  if (Array.isArray(value.value)) return value.value.join("\n");
  return value.value ?? "";
}

/**
 * 从 BlockContent 类型的值中提取文本数组和对齐信息
 */
export function extractBlockSectionAndAlign(
  value: { value: string[]; align?: string } | undefined | null,
): { values: string[]; align?: string } {
  if (!value) return { values: [], align: undefined };
  return { values: value.value ?? [], align: value.align };
}

/**
 * 从 BlockContent 类型的值中提取文本和对齐信息
 */
export function extractBlockTextAndAlign(
  value: { value: string | string[]; align?: string } | undefined | null,
): { text: string; align?: string } {
  if (!value) return { text: "", align: undefined };
  const text = Array.isArray(value.value)
    ? value.value.join("\n")
    : (value.value ?? "");
  return { text, align: value.align };
}
