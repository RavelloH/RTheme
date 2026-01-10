export interface EditorConfig {
  [key: string]: unknown;
}

export interface EditorContent {
  [key: string]: {
    content: string;
    lastUpdatedAt: string;
    config: EditorConfig;
  };
}

const STORAGE_KEY = "editor";

/**
 * 保存编辑器内容到localStorage
 * @param content - 要保存的 Markdown 内容
 * @param config - 编辑器配置
 * @param isMarkdown - 保留参数以保持向后兼容（现在总是为 true）
 * @param key - 存储的键名,默认为"new"
 */
export function saveEditorContent(
  content: string,
  config: EditorConfig = {},
  _isMarkdown: boolean = true,
  key: string = "new",
): void {
  // 检查是否在浏览器环境
  if (typeof window === "undefined") return;

  try {
    // 现在所有编辑器都直接导出 Markdown，不再需要 HTML 转换
    const markdown = content;

    // 读取现有数据
    const existingData = loadAllEditorContent() || {};

    // 更新指定键的数据
    existingData[key] = {
      content: markdown,
      lastUpdatedAt: new Date().toISOString(),
      config,
    };

    // 保存到localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
  } catch (error) {
    console.error("Failed to save editor content:", error);
  }
}

/**
 * 从localStorage读取指定键的编辑器内容
 * @param key - 要读取的键名,默认为"new"
 */
export function loadEditorContent(
  key: string = "new",
): EditorContent[string] | null {
  // 检查是否在浏览器环境
  if (typeof window === "undefined") return null;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    const allContent = JSON.parse(data) as EditorContent;
    return allContent[key] || null;
  } catch (error) {
    console.error("Failed to load editor content:", error);
    return null;
  }
}

/**
 * 从localStorage读取所有编辑器内容
 */
export function loadAllEditorContent(): EditorContent | null {
  // 检查是否在浏览器环境
  if (typeof window === "undefined") return null;

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as EditorContent;
  } catch (error) {
    console.error("Failed to load all editor content:", error);
    return null;
  }
}

/**
 * 清除localStorage中指定键的编辑器内容
 * @param key - 要清除的键名,如果不提供则清除所有内容
 */
export function clearEditorContent(key?: string): void {
  // 检查是否在浏览器环境
  if (typeof window === "undefined") return;

  try {
    if (!key) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const data = loadAllEditorContent();
    if (data && data[key]) {
      delete data[key];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (error) {
    console.error("Failed to clear editor content:", error);
  }
}
