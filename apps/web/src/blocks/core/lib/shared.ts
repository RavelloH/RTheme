/**
 * 解析后的占位符结构
 */
export interface ParsedPlaceholder {
  /** 占位符名称（不含花括号和参数） */
  name: string;
  /** 占位符参数键值对 */
  params: Record<string, string>;
  /** 原始占位符字符串 */
  raw: string;
}

/**
 * 解析单个占位符
 * 支持格式：
 * - {name}
 * - {name|key=value}
 * - {name|key1=value1&key2=value2}
 */
export function parsePlaceholder(placeholder: string): ParsedPlaceholder {
  const raw = `{${placeholder}}`;

  // 检查是否包含参数分隔符 |
  const pipeIndex = placeholder.indexOf("|");
  if (pipeIndex === -1) {
    // 简单占位符：{name}
    return { name: placeholder, params: {}, raw };
  }

  // 带参数的占位符：{name|key=value&key2=value2}
  const name = placeholder.slice(0, pipeIndex);
  const paramsStr = placeholder.slice(pipeIndex + 1);
  const params: Record<string, string> = {};

  // 解析 key=value&key2=value2
  if (paramsStr) {
    paramsStr.split("&").forEach((pair) => {
      const [key, value] = pair.split("=");
      if (key && value !== undefined) {
        params[key] = value;
      }
    });
  }

  return { name, params, raw };
}

/**
 * 提取文本中的所有占位符名称（用于向后兼容）
 * @deprecated 使用 extractParsedPlaceholders 代替
 */
export function extractPlaceholders(text: string): string[] {
  if (!text) return [];
  // 匹配 {name} 或 {name|...} 格式
  const placeholderRegex = /\{([^{}|]+)(?:\|[^{}]*)?\}/g;
  const placeholders = new Set<string>();
  let match;
  while ((match = placeholderRegex.exec(text)) !== null) {
    if (match[1]) placeholders.add(match[1]);
  }
  return Array.from(placeholders);
}

/**
 * 提取文本中的所有占位符（完整解析）
 */
export function extractParsedPlaceholders(text: string): ParsedPlaceholder[] {
  if (!text) return [];
  // 匹配 {name} 或 {name|key=value&key2=value2} 格式
  const placeholderRegex = /\{([^{}]+)\}/g;
  const placeholders: ParsedPlaceholder[] = [];
  let match;
  while ((match = placeholderRegex.exec(text)) !== null) {
    if (match[1]) {
      placeholders.push(parsePlaceholder(match[1]));
    }
  }
  return placeholders;
}

/**
 * 递归提取对象中所有字符串值的占位符（仅名称，向后兼容）
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
 * 递归提取对象中所有字符串值的占位符（完整解析）
 */
export function extractParsedPlaceholdersFromValue(
  value: unknown,
): ParsedPlaceholder[] {
  const placeholders: ParsedPlaceholder[] = [];
  if (typeof value === "string") {
    extractParsedPlaceholders(value).forEach((p) => placeholders.push(p));
  } else if (Array.isArray(value)) {
    value.forEach((item) => {
      extractParsedPlaceholdersFromValue(item).forEach((p) =>
        placeholders.push(p),
      );
    });
  } else if (typeof value === "object" && value !== null) {
    Object.values(value).forEach((item) => {
      extractParsedPlaceholdersFromValue(item).forEach((p) =>
        placeholders.push(p),
      );
    });
  }
  return placeholders;
}

/**
 * 替换文本中的占位符（纯文本版本）
 * 支持 {name} 和 {name|key=value} 格式
 * 参数化占位符会被提取参数后使用名称查找数据
 */
export function replacePlaceholders(
  text: string,
  data: Record<string, unknown>,
): string {
  if (!text) return "";
  // 匹配 {name} 或 {name|key=value&key2=value2} 格式
  return text.replace(/\{([^{}]+)\}/g, (match, placeholder) => {
    if (!data) return match;

    // 解析占位符
    const parsed = parsePlaceholder(placeholder);

    // 使用占位符名称查找数据（忽略参数）
    const value = data[parsed.name];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 替换文本中的占位符（支持 ReactNode 版本）
 * 用于处理包含客户端组件的占位符
 * 支持 {name} 和 {name|key=value} 格式
 */
export function replacePlaceholdersWithReact(
  text: string,
  data: Record<string, unknown>,
): (string | React.ReactElement)[] {
  if (!text) return [];

  // 按占位符分割文本
  const parts = text.split(/\{([^{}]+)\}/g);

  return parts.map((part, index) => {
    // 偶数索引是普通文本
    if (index % 2 === 0) return part;

    // 奇数索引是占位符字符串（可能包含参数）
    // 解析占位符获取名称
    const parsed = parsePlaceholder(part);

    // 使用占位符名称查找数据（忽略参数）
    const value = data?.[parsed.name];

    // 如果是 ReactElement，直接返回
    if (ReactIsValidElement(value)) return value;

    // 否则转换为字符串
    return value !== undefined ? String(value) : `{${part}}`;
  });
}

// 简单的 React.isValidElement 检查（避免导入 React）
function ReactIsValidElement(value: unknown): value is React.ReactElement {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$typeof" in (value as Record<string, unknown>) &&
    "type" in (value as Record<string, unknown>)
  );
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
