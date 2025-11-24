/**
 * Tiptap 编辑器适配器
 *
 * 将 Tiptap 编辑器包装为统一的适配器接口
 */

import type {
  IEditorAdapter,
  EditorState,
  EditorCommand,
  CommandWithParams,
  TiptapInstance,
  AdapterConfig,
} from "./types";
import { defaultEditorState } from "./types";

export class TiptapAdapter implements IEditorAdapter {
  readonly type = "visual" as const;
  private editor: TiptapInstance;
  private config: AdapterConfig;
  private stateListeners: Set<(state: EditorState) => void> = new Set();
  private contentListeners: Set<(content: string) => void> = new Set();
  private unsubscribers: Array<() => void> = [];

  constructor(editor: TiptapInstance, config: AdapterConfig) {
    this.editor = editor;
    this.config = config;
    this.setupListeners();
  }

  /**
   * 设置编辑器事件监听
   */
  private setupListeners(): void {
    // 监听编辑器状态变化
    const updateHandler = () => {
      const state = this.getState();
      this.stateListeners.forEach((listener) => listener(state));
      this.config.onStateChange?.(state);

      const content = this.getContent();
      this.contentListeners.forEach((listener) => listener(content));
      this.config.onContentChange?.(content);
    };

    const selectionUpdateHandler = () => {
      const state = this.getState();
      this.stateListeners.forEach((listener) => listener(state));
      this.config.onStateChange?.(state);
    };

    this.editor.on("update", updateHandler);
    this.editor.on("selectionUpdate", selectionUpdateHandler);
    this.editor.on("transaction", selectionUpdateHandler);

    this.unsubscribers.push(() => {
      this.editor.off("update", updateHandler);
      this.editor.off("selectionUpdate", selectionUpdateHandler);
      this.editor.off("transaction", selectionUpdateHandler);
    });
  }

  /**
   * 获取当前编辑器状态
   */
  getState(): EditorState {
    try {
      return {
        isBold: this.editor.isActive("bold"),
        isItalic: this.editor.isActive("italic"),
        isStrike: this.editor.isActive("strike"),
        isUnderline: this.editor.isActive("underline"),
        isHighlight: this.editor.isActive("highlight"),
        isCode: this.editor.isActive("code"),
        isSuperscript: this.editor.isActive("superscript"),
        isSubscript: this.editor.isActive("subscript"),
        isBlockquote: this.editor.isActive("blockquote"),
        isCodeBlock: this.editor.isActive("codeBlock"),
        isTable: this.editor.isActive("table"),
        isLink: this.editor.isActive("link"),
        isBulletList: this.editor.isActive("bulletList"),
        isOrderedList: this.editor.isActive("orderedList"),
        isTaskList: this.editor.isActive("taskList"),
        headingLevel: this.getActiveHeadingLevel(),
        textAlign: this.getTextAlign(),
        currentLinkUrl: this.editor.isActive("link")
          ? this.editor.getAttributes("link").href || ""
          : "",
        currentCodeBlockLanguage: this.editor.isActive("codeBlock")
          ? this.editor.getAttributes("codeBlock").language || ""
          : "",
      };
    } catch (error) {
      console.error("Failed to get Tiptap editor state:", error);
      return defaultEditorState;
    }
  }

  /**
   * 获取当前激活的标题级别
   */
  private getActiveHeadingLevel(): number | null {
    for (let level = 1; level <= 6; level++) {
      if (this.editor.isActive("heading", { level })) {
        return level;
      }
    }
    return null;
  }

  /**
   * 获取当前文本对齐方式
   */
  private getTextAlign(): "left" | "center" | "right" | "justify" | null {
    const alignments: Array<"left" | "center" | "right" | "justify"> = [
      "left",
      "center",
      "right",
      "justify",
    ];
    for (const align of alignments) {
      if (this.editor.isActive({ textAlign: align })) {
        return align;
      }
    }
    return null;
  }

  /**
   * 获取编辑器内容（Markdown 格式）
   */
  getContent(): string {
    try {
      // 使用 Tiptap 的 markdown 扩展导出
      return (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (this.editor as any).markdown?.serialize?.(this.editor.getJSON()) || ""
      );
    } catch (error) {
      console.error("Failed to get Tiptap content:", error);
      return "";
    }
  }

  /**
   * 设置编辑器内容（从 Markdown）
   */
  setContent(content: string): void {
    try {
      // 使用 Tiptap 的 markdown 扩展解析
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (this.editor as any).markdown?.parse?.(content);
      if (json) {
        this.editor.commands.setContent(json);
      }
    } catch (error) {
      console.error("Failed to set Tiptap content:", error);
    }
  }

  /**
   * 获取选中的文本
   */
  getSelectedText(): string {
    try {
      const { from, to } = this.editor.state.selection;
      return this.editor.state.doc.textBetween(from, to, "");
    } catch (error) {
      console.error("Failed to get selected text:", error);
      return "";
    }
  }

  /**
   * 聚焦编辑器
   */
  focus(): void {
    this.editor.chain().focus().run();
  }

  /**
   * 执行无参数命令
   */
  executeCommand(command: EditorCommand): void {
    const commandMap: Record<EditorCommand, () => void> = {
      undo: () => this.editor.chain().focus().undo().run(),
      redo: () => this.editor.chain().focus().redo().run(),
      bold: () => this.editor.chain().focus().toggleBold().run(),
      italic: () => this.editor.chain().focus().toggleItalic().run(),
      strike: () => this.editor.chain().focus().toggleStrike().run(),
      underline: () => this.editor.chain().focus().toggleUnderline().run(),
      highlight: () => this.editor.chain().focus().toggleHighlight().run(),
      code: () => this.editor.chain().focus().toggleCode().run(),
      superscript: () => this.editor.chain().focus().toggleSuperscript().run(),
      subscript: () => this.editor.chain().focus().toggleSubscript().run(),
      blockquote: () => this.editor.chain().focus().toggleBlockquote().run(),
      codeBlock: () => this.editor.chain().focus().toggleCodeBlock().run(),
      horizontalRule: () =>
        this.editor.chain().focus().setHorizontalRule().run(),
      bulletList: () => this.editor.chain().focus().toggleBulletList().run(),
      orderedList: () => this.editor.chain().focus().toggleOrderedList().run(),
      taskList: () => this.editor.chain().focus().toggleTaskList().run(),
      alignLeft: () => this.editor.chain().focus().setTextAlign("left").run(),
      alignCenter: () =>
        this.editor.chain().focus().setTextAlign("center").run(),
      alignRight: () => this.editor.chain().focus().setTextAlign("right").run(),
    };

    const handler = commandMap[command];
    if (handler) {
      handler();
    } else {
      console.warn(`Unknown command: ${command}`);
    }
  }

  /**
   * 执行带参数命令
   */
  executeCommandWithParams<K extends keyof CommandWithParams>(
    command: K,
    params: CommandWithParams[K],
  ): void {
    switch (command) {
      case "heading":
        this.editor
          .chain()
          .focus()
          .toggleHeading({
            level: (params as { level: number }).level as 1 | 2 | 3 | 4 | 5 | 6,
          })
          .run();
        break;

      case "insertTable": {
        const { rows, cols } = params as { rows: number; cols: number };
        this.editor
          .chain()
          .focus()
          .insertTable({ rows, cols, withHeaderRow: rows > 1 })
          .run();
        break;
      }

      case "insertLink": {
        const { text, url } = params as { text: string; url: string };
        const isEditingExistingLink = this.editor.isActive("link");

        if (isEditingExistingLink) {
          if (text) {
            this.editor
              .chain()
              .focus()
              .deleteSelection()
              .insertContent({
                type: "text",
                marks: [{ type: "link", attrs: { href: url } }],
                text: text,
              })
              .run();
          } else {
            this.editor.chain().focus().setLink({ href: url }).run();
          }
        } else {
          const { from, to } = this.editor.state.selection;
          const hasSelection = from !== to;

          if (text) {
            this.editor
              .chain()
              .focus()
              .insertContent({
                type: "text",
                marks: [{ type: "link", attrs: { href: url } }],
                text: text,
              })
              .run();
          } else if (hasSelection) {
            this.editor.chain().focus().setLink({ href: url }).run();
          } else {
            this.editor
              .chain()
              .focus()
              .insertContent({
                type: "text",
                marks: [{ type: "link", attrs: { href: url } }],
                text: url,
              })
              .run();
          }
        }
        break;
      }

      case "editLink": {
        const { url } = params as { url: string };
        this.editor.chain().focus().setLink({ href: url }).run();
        break;
      }

      case "insertImage": {
        const { url, alt } = params as { url: string; alt?: string };
        this.editor
          .chain()
          .focus()
          .insertContent({
            type: "image",
            attrs: { src: url, alt: alt || "" },
          })
          .run();
        break;
      }

      case "setCodeBlockLanguage": {
        const { language } = params as { language: string };
        this.editor
          .chain()
          .focus()
          .updateAttributes("codeBlock", { language })
          .run();
        break;
      }

      default:
        console.warn(`Unknown command with params: ${command}`);
    }
  }

  /**
   * 注册状态变化监听器
   */
  onStateChange(callback: (state: EditorState) => void): () => void {
    this.stateListeners.add(callback);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  /**
   * 注册内容变化监听器
   */
  onContentChange(callback: (content: string) => void): () => void {
    this.contentListeners.add(callback);
    return () => {
      this.contentListeners.delete(callback);
    };
  }

  /**
   * 销毁适配器
   */
  destroy(): void {
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.stateListeners.clear();
    this.contentListeners.clear();
  }
}
