import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
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

// 初始化 Turndown 服务
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "_",
});

// 使用 GFM 插件支持表格、删除线、任务列表
turndownService.use(gfm);

// 自定义规则必须在GFM插件之后添加,以覆盖默认行为

// 自定义规则：普通列表项 - 移除额外换行
turndownService.addRule("listItem", {
  filter: (node) => {
    if (node.nodeName !== "LI") return false;
    const li = node as HTMLElement;
    // 排除任务列表项
    return (
      !li.hasAttribute("data-checked") &&
      li.querySelector('input[type="checkbox"]') === null
    );
  },
  replacement: (content, _node, options) => {
    // 清理内容，移除首尾空白和多余换行
    const cleanContent = content.trim().replace(/\n+/g, "\n");

    // 检查是否是嵌套列表
    const prefix = options.bulletListMarker || "-";

    return `${prefix} ${cleanContent}\n`;
  },
});

// 自定义规则：任务列表 - 确保正确转换 (覆盖GFM的默认处理)
turndownService.addRule("taskListItem", {
  filter: (node) => {
    if (node.nodeName !== "LI") return false;
    const li = node as HTMLElement;
    // 检查是否有 data-checked 属性或包含 checkbox input
    return (
      li.hasAttribute("data-checked") ||
      li.querySelector('input[type="checkbox"]') !== null
    );
  },
  replacement: (content, node) => {
    const li = node as HTMLElement;
    let isChecked = false;

    // 尝试从 data-checked 属性获取状态
    if (li.hasAttribute("data-checked")) {
      isChecked = li.getAttribute("data-checked") === "true";
    } else {
      // 尝试从 checkbox input 获取状态
      const checkbox = li.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;
      if (checkbox) {
        isChecked = checkbox.checked;
      }
    }

    const checkbox = isChecked ? "[x]" : "[ ]";
    // 清理内容中可能存在的checkbox HTML
    const cleanContent = content.replace(/<input[^>]*>/g, "").trim();
    return `- ${checkbox} ${cleanContent}`;
  },
});

// 自定义规则:表格 - 增强处理带有复杂属性的表格,保留单元格内格式
turndownService.addRule("customTable", {
  filter: "table",
  replacement: (content, node) => {
    const table = node as HTMLTableElement;
    const rows: string[][] = [];

    // 提取所有行
    const allRows = Array.from(table.querySelectorAll("tr"));

    allRows.forEach((tr) => {
      const cells: string[] = [];
      const tableCells = Array.from(tr.querySelectorAll("td, th"));

      tableCells.forEach((cell) => {
        // 使用 innerHTML 保留格式,然后通过 turndownService 转换
        const cellHTML = (cell as HTMLElement).innerHTML;
        // 将 HTML 转换为 Markdown,保留粗体、斜体等格式
        let cellMarkdown = turndownService.turndown(cellHTML);
        // 移除换行符,替换为空格,避免破坏表格结构
        cellMarkdown = cellMarkdown.replace(/\n/g, " ").trim();
        // 转义管道符,避免破坏表格结构
        cellMarkdown = cellMarkdown.replace(/\|/g, "\\|");
        cells.push(cellMarkdown);
      });

      if (cells.length > 0) {
        rows.push(cells);
      }
    });

    if (rows.length === 0) return "";

    // 构建Markdown表格
    let markdown = "\n\n";

    // 第一行作为表头
    const headerRow = rows[0];
    if (!headerRow) return "";

    markdown += "| " + headerRow.join(" | ") + " |\n";

    // 分隔线
    markdown += "| " + headerRow.map(() => "---").join(" | ") + " |\n";

    // 数据行
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      // 确保每行的列数与表头一致
      while (row.length < headerRow.length) {
        row.push("");
      }
      markdown += "| " + row.join(" | ") + " |\n";
    }

    markdown += "\n";

    return markdown;
  },
});

// 自定义规则：下划线 - 保留HTML
turndownService.addRule("underline", {
  filter: ["u"],
  replacement: (content) => {
    return `<u>${content}</u>`;
  },
});

// 自定义规则：高亮 - 保留HTML以支持嵌套格式
turndownService.addRule("highlight", {
  filter: (node) => {
    return (
      node.nodeName === "MARK" ||
      (node.nodeName === "SPAN" && node.classList?.contains("highlight"))
    );
  },
  replacement: (content, node) => {
    // 保留为HTML标签,这样内部的格式化不会丢失
    const innerHTML = (node as HTMLElement).innerHTML;
    return `<mark>${innerHTML}</mark>`;
  },
});

// 自定义规则：上标 - 保留HTML (因为Markdown扩展不支持^语法)
turndownService.addRule("superscript", {
  filter: ["sup"],
  replacement: (content) => {
    return `<sup>${content}</sup>`;
  },
});

// 自定义规则：下标 - 保留HTML (因为~会被识别为删除线)
turndownService.addRule("subscript", {
  filter: ["sub"],
  replacement: (content) => {
    return `<sub>${content}</sub>`;
  },
});

// 自定义规则：文本对齐 - 保留HTML
turndownService.addRule("textAlign", {
  filter: (node) => {
    if (node.nodeName === "P" || node.nodeName === "DIV") {
      const style = (node as HTMLElement).getAttribute("style");
      if (style && style.includes("text-align")) {
        return true;
      }
    }
    return false;
  },
  replacement: (content, node) => {
    const style = (node as HTMLElement).getAttribute("style");
    const textAlign = style?.match(/text-align:\s*(\w+)/)?.[1];

    // 左对齐是默认值，不需要保留HTML
    if (textAlign === "left" || !textAlign) {
      return `\n\n${content}\n\n`;
    }

    // 居中和右对齐保留HTML
    return `\n\n<p style="text-align: ${textAlign};">${content}</p>\n\n`;
  },
});

/**
 * 将HTML转换为Markdown
 */
export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}

/**
 * 保存编辑器内容到localStorage
 * @param content - 要保存的内容(HTML或Markdown)
 * @param config - 编辑器配置
 * @param isMarkdown - 是否为Markdown格式(true表示直接保存,false表示需要HTML转Markdown)
 * @param key - 存储的键名,默认为"new"
 */
export function saveEditorContent(
  content: string,
  config: EditorConfig = {},
  isMarkdown: boolean = false,
  key: string = "new",
): void {
  // 检查是否在浏览器环境
  if (typeof window === "undefined") return;

  try {
    // 1. 根据类型处理内容
    const markdown = isMarkdown ? content : htmlToMarkdown(content);

    // 2. 读取现有数据
    const existingData = loadAllEditorContent() || {};

    // 3. 更新指定键的数据
    existingData[key] = {
      content: markdown,
      lastUpdatedAt: new Date().toISOString(),
      config,
    };

    // 4. 保存到localStorage
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
