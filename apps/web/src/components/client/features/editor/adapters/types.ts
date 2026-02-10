/**
 * 编辑器适配器系统 - 类型定义
 *
 * 提供统一的接口让四种编辑器（Tiptap、Markdown、MDX、HTML）保持行为同步
 */

import type { Editor as TiptapEditorType } from "@tiptap/react";
import type { editor } from "monaco-editor";

// ==================== 编辑器状态类型 ====================

/**
 * 统一的编辑器状态
 */
export interface EditorState {
  // 文本格式状态
  isBold: boolean;
  isItalic: boolean;
  isStrike: boolean;
  isUnderline: boolean;
  isHighlight: boolean;
  isCode: boolean;
  isSuperscript: boolean;
  isSubscript: boolean;

  // 块级元素状态
  isBlockquote: boolean;
  isCodeBlock: boolean;
  isTable: boolean;
  isLink: boolean;
  isImage: boolean;

  // 列表状态
  isBulletList: boolean;
  isOrderedList: boolean;
  isTaskList: boolean;

  // 标题状态
  headingLevel: number | null; // 1-6 或 null

  // 对齐状态
  textAlign: "left" | "center" | "right" | "justify" | null;

  // 当前链接 URL
  currentLinkUrl: string;

  // 当前图片信息
  currentImageSrc: string;
  currentImageAlt: string;

  // 代码块语言
  currentCodeBlockLanguage: string;
}

/**
 * 默认编辑器状态
 */
export const defaultEditorState: EditorState = {
  isBold: false,
  isItalic: false,
  isStrike: false,
  isUnderline: false,
  isHighlight: false,
  isCode: false,
  isSuperscript: false,
  isSubscript: false,
  isBlockquote: false,
  isCodeBlock: false,
  isTable: false,
  isLink: false,
  isImage: false,
  isBulletList: false,
  isOrderedList: false,
  isTaskList: false,
  headingLevel: null,
  textAlign: null,
  currentLinkUrl: "",
  currentImageSrc: "",
  currentImageAlt: "",
  currentCodeBlockLanguage: "",
};

// ==================== 编辑器类型 ====================

export type EditorType = "visual" | "markdown" | "mdx" | "html";

// ==================== 编辑器命令类型 ====================

/**
 * 编辑器支持的所有命令
 */
export type EditorCommand =
  // 历史操作
  | "undo"
  | "redo"
  // 文本格式
  | "bold"
  | "italic"
  | "strike"
  | "underline"
  | "highlight"
  | "code"
  | "superscript"
  | "subscript"
  // 块级元素
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  // 列表
  | "bulletList"
  | "orderedList"
  | "taskList"
  // 对齐
  | "alignLeft"
  | "alignCenter"
  | "alignRight";

/**
 * 带参数的命令
 */
export interface CommandWithParams {
  heading: { level: 1 | 2 | 3 | 4 | 5 | 6 };
  insertTable: { rows: number; cols: number };
  insertLink: { text: string; url: string };
  editLink: { url: string };
  insertImage: { url: string; alt?: string };
  insertImages: { urls: string[]; alt?: string };
  editImage: { alt: string };
  setCodeBlockLanguage: { language: string };
}

// ==================== 编辑器适配器接口 ====================

/**
 * 编辑器适配器接口
 *
 * 所有编辑器适配器必须实现此接口
 */
export interface IEditorAdapter {
  /** 适配器类型 */
  readonly type: EditorType;

  /** 获取当前编辑器状态 */
  getState(): EditorState;

  /** 获取编辑器内容（统一为 Markdown 格式） */
  getContent(): string;

  /** 设置编辑器内容（从 Markdown 格式） */
  setContent(content: string): void;

  /** 获取选中的文本 */
  getSelectedText(): string;

  /** 聚焦编辑器 */
  focus(): void;

  // ==================== 基础命令 ====================

  /** 执行无参数命令 */
  executeCommand(command: EditorCommand): void;

  /** 执行带参数命令 */
  executeCommandWithParams<K extends keyof CommandWithParams>(
    command: K,
    params: CommandWithParams[K],
  ): void;

  // ==================== 状态监听 ====================

  /** 注册状态变化监听器 */
  onStateChange(callback: (state: EditorState) => void): () => void;

  /** 注册内容变化监听器 */
  onContentChange(callback: (content: string) => void): () => void;

  // ==================== 生命周期 ====================

  /** 销毁适配器 */
  destroy(): void;
}

// ==================== 编辑器实例类型 ====================

export type TiptapInstance = TiptapEditorType;
export type MonacoInstance = editor.IStandaloneCodeEditor;

// ==================== 适配器配置 ====================

export interface AdapterConfig {
  /** 存储键 */
  storageKey: string;
  /** 是否启用持久化 */
  enablePersistence?: boolean;
  /** 状态变化回调 */
  onStateChange?: (state: EditorState) => void;
  /** 内容变化回调 */
  onContentChange?: (content: string) => void;
}

// ==================== 适配器管理器事件 ====================

export interface AdapterManagerEvents {
  /** 编辑器类型切换 */
  onTypeChange?: (type: EditorType) => void;
  /** 状态变化 */
  onStateChange?: (state: EditorState) => void;
  /** 内容变化 */
  onContentChange?: (content: string) => void;
  /** 适配器就绪 */
  onAdapterReady?: (adapter: IEditorAdapter) => void;
}
