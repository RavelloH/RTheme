/**
 * Monaco 编辑器基础适配器
 *
 * 为 Markdown/MDX/HTML 编辑器提供统一的基础功能
 */

import type {
  AdapterConfig,
  CommandWithParams,
  EditorCommand,
  EditorState,
  EditorType,
  IEditorAdapter,
  MonacoInstance,
} from "@/components/client/features/editor/adapters/types";
import { defaultEditorState } from "@/components/client/features/editor/adapters/types";
import * as monacoHelpers from "@/components/client/features/editor/MonacoHelpers";

/**
 * Monaco 编辑器基础适配器类
 *
 * Markdown/MDX/HTML 适配器将继承此类
 */
export abstract class BaseMonacoAdapter implements IEditorAdapter {
  abstract readonly type: EditorType;
  protected editor: MonacoInstance;
  protected config: AdapterConfig;
  protected stateListeners: Set<(state: EditorState) => void> = new Set();
  protected contentListeners: Set<(content: string) => void> = new Set();
  protected unsubscribers: Array<() => void> = [];

  constructor(editor: MonacoInstance, config: AdapterConfig) {
    this.editor = editor;
    this.config = config;
    this.setupListeners();
  }

  /**
   * 设置编辑器事件监听
   */
  protected setupListeners(): void {
    // Monaco 编辑器的内容变化监听
    const disposable = this.editor.onDidChangeModelContent(() => {
      const content = this.getContent();
      this.contentListeners.forEach((listener) => listener(content));
      this.config.onContentChange?.(content);

      // Monaco 不支持实时状态追踪，但我们可以在内容变化时触发状态更新
      const state = this.getState();
      this.stateListeners.forEach((listener) => listener(state));
      this.config.onStateChange?.(state);
    });

    // 选区变化监听
    const selectionDisposable = this.editor.onDidChangeCursorSelection(() => {
      const state = this.getState();
      this.stateListeners.forEach((listener) => listener(state));
      this.config.onStateChange?.(state);
    });

    // Monaco 文本编辑器快捷键支持（Markdown/MDX/HTML）
    const keyboardDisposable = this.editor.onKeyDown((event) => {
      if (!this.handleKeyboardShortcut(event.browserEvent)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    });

    this.unsubscribers.push(() => {
      disposable.dispose();
      selectionDisposable.dispose();
      keyboardDisposable.dispose();
    });
  }

  /**
   * 处理快捷键命令
   *
   * 使用 `event.code`，避免不同键盘布局下 `event.key` 差异导致的快捷键失效。
   */
  protected handleKeyboardShortcut(event: KeyboardEvent): boolean {
    const isCtrlOrMeta = event.ctrlKey || event.metaKey;
    if (!isCtrlOrMeta) return false;

    const { code, shiftKey, altKey } = event;

    // 历史操作
    if (!altKey && !shiftKey && code === "KeyZ") {
      this.executeCommand("undo");
      return true;
    }

    if (
      (!altKey && shiftKey && code === "KeyZ") ||
      (!altKey && !shiftKey && code === "KeyY")
    ) {
      this.executeCommand("redo");
      return true;
    }

    // 标题：Ctrl/Cmd + Alt + 1..6
    if (altKey && !shiftKey) {
      const headingLevelMap: Record<string, 1 | 2 | 3 | 4 | 5 | 6> = {
        Digit1: 1,
        Digit2: 2,
        Digit3: 3,
        Digit4: 4,
        Digit5: 5,
        Digit6: 6,
      };

      const level = headingLevelMap[code];
      if (level) {
        this.executeCommandWithParams("heading", { level });
        return true;
      }
    }

    // 组合快捷键：Ctrl/Cmd + Shift + ...
    if (shiftKey && !altKey) {
      if (code === "Digit7") {
        this.executeCommand("orderedList");
        return true;
      }
      if (code === "Digit8") {
        this.executeCommand("bulletList");
        return true;
      }
      if (code === "Digit9") {
        this.executeCommand("taskList");
        return true;
      }

      if (code === "KeyL") {
        this.executeCommand("alignLeft");
        return true;
      }
      if (code === "KeyE") {
        this.executeCommand("alignCenter");
        return true;
      }
      if (code === "KeyR") {
        this.executeCommand("alignRight");
        return true;
      }

      if (code === "KeyS") {
        this.executeCommand("strike");
        return true;
      }
      if (code === "KeyH") {
        this.executeCommand("highlight");
        return true;
      }
      if (code === "KeyB") {
        this.executeCommand("blockquote");
        return true;
      }
    }

    // Ctrl/Cmd + Alt + C：代码块
    if (!shiftKey && altKey && code === "KeyC") {
      this.executeCommand("codeBlock");
      return true;
    }

    // 基础快捷键：Ctrl/Cmd + ...
    if (!shiftKey && !altKey) {
      if (code === "KeyB") {
        this.executeCommand("bold");
        return true;
      }
      if (code === "KeyI") {
        this.executeCommand("italic");
        return true;
      }
      if (code === "KeyU") {
        this.executeCommand("underline");
        return true;
      }
      if (code === "KeyE") {
        this.executeCommand("code");
        return true;
      }
      if (code === "Period") {
        this.executeCommand("superscript");
        return true;
      }
      if (code === "Comma") {
        this.executeCommand("subscript");
        return true;
      }
    }

    return false;
  }

  /**
   * 获取当前编辑器状态
   *
   * 注意：Monaco 编辑器是纯文本编辑器，无法像 Tiptap 那样获取实时状态
   * 这里返回的状态是基于当前光标位置和内容分析的近似值
   */
  getState(): EditorState {
    try {
      const model = this.editor.getModel();
      if (!model) return defaultEditorState;

      const position = this.editor.getPosition();
      if (!position) return defaultEditorState;

      // 获取当前行的内容
      const lineContent = model.getLineContent(position.lineNumber);

      // 分析当前行是否是标题
      const headingMatch = lineContent.match(/^(#{1,6})\s/);
      const headingLevel = headingMatch?.[1]?.length ?? null;

      // 分析是否在列表中
      const isBulletList = /^[\s]*[-*+]\s/.test(lineContent);
      const isOrderedList = /^[\s]*\d+\.\s/.test(lineContent);
      const isTaskList = /^[\s]*-\s\[[\sx]\]\s/.test(lineContent);

      // 分析是否在引用块中
      const isBlockquote = /^>\s/.test(lineContent);

      // 分析是否在代码块中
      const isCodeBlock = this.isInCodeBlock(model, position.lineNumber);

      return {
        ...defaultEditorState,
        headingLevel: headingLevel as number | null,
        isBulletList,
        isOrderedList,
        isTaskList,
        isBlockquote,
        isCodeBlock,
        // Monaco 无法检测内联格式（粗体、斜体等）的激活状态
      };
    } catch (error) {
      console.error("Failed to get Monaco editor state:", error);
      return defaultEditorState;
    }
  }

  /**
   * 检查当前行是否在代码块内
   */
  private isInCodeBlock(
    model: ReturnType<MonacoInstance["getModel"]>,
    lineNumber: number,
  ): boolean {
    if (!model) return false;

    let inCodeBlock = false;
    for (let i = 1; i <= lineNumber; i++) {
      const line = model.getLineContent(i);
      if (line.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
      }
    }
    return inCodeBlock;
  }

  /**
   * 获取编辑器内容（Markdown 格式）
   */
  getContent(): string {
    return this.editor.getValue();
  }

  /**
   * 设置编辑器内容
   */
  setContent(content: string): void {
    this.editor.setValue(content);
  }

  /**
   * 获取选中的文本
   */
  getSelectedText(): string {
    const selection = this.editor.getSelection();
    if (!selection) return "";
    return this.editor.getModel()?.getValueInRange(selection) || "";
  }

  /**
   * 聚焦编辑器
   */
  focus(): void {
    this.editor.focus();
  }

  /**
   * 执行无参数命令
   */
  executeCommand(command: EditorCommand): void {
    const commandMap: Record<EditorCommand, () => void> = {
      undo: () => this.editor.trigger("", "undo", null),
      redo: () => this.editor.trigger("", "redo", null),
      bold: () => monacoHelpers.wrapSelection(this.editor, "**"),
      italic: () => monacoHelpers.wrapSelection(this.editor, "*"),
      strike: () => monacoHelpers.wrapSelection(this.editor, "~~"),
      underline: () => monacoHelpers.wrapSelection(this.editor, "<u>", "</u>"),
      highlight: () =>
        monacoHelpers.wrapSelection(this.editor, "<mark>", "</mark>"),
      code: () => monacoHelpers.wrapSelection(this.editor, "`"),
      superscript: () =>
        monacoHelpers.wrapSelection(this.editor, "<sup>", "</sup>"),
      subscript: () =>
        monacoHelpers.wrapSelection(this.editor, "<sub>", "</sub>"),
      blockquote: () => monacoHelpers.toggleLinePrefix(this.editor, "> "),
      codeBlock: () => monacoHelpers.insertCodeBlock(this.editor),
      horizontalRule: () => monacoHelpers.insertHorizontalRule(this.editor),
      bulletList: () => monacoHelpers.toggleLinePrefix(this.editor, "- "),
      orderedList: () => monacoHelpers.toggleLinePrefix(this.editor, "1. "),
      taskList: () => monacoHelpers.toggleLinePrefix(this.editor, "- [ ] "),
      alignLeft: () => monacoHelpers.setTextAlign(this.editor, "left"),
      alignCenter: () => monacoHelpers.setTextAlign(this.editor, "center"),
      alignRight: () => monacoHelpers.setTextAlign(this.editor, "right"),
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
      case "heading": {
        const { level } = params as { level: number };
        monacoHelpers.setHeading(this.editor, level);
        break;
      }

      case "insertTable": {
        const { rows, cols } = params as { rows: number; cols: number };
        monacoHelpers.insertTable(this.editor, rows, cols);
        break;
      }

      case "insertLink": {
        const { text, url } = params as { text: string; url: string };
        monacoHelpers.insertLink(this.editor, url, text);
        break;
      }

      case "editLink": {
        const { url } = params as { url: string };
        // Monaco 中编辑链接的逻辑与插入相同
        const selectedText = this.getSelectedText();
        monacoHelpers.insertLink(this.editor, url, selectedText);
        break;
      }

      case "insertImage": {
        const { url, alt } = params as { url: string; alt?: string };
        monacoHelpers.insertImage(this.editor, url, alt || "图片");
        break;
      }

      case "insertImages": {
        const { urls, alt } = params as { urls: string[]; alt?: string };
        // 批量插入图片，每个图片之间添加换行
        const imageMarkdown = urls
          .map((url) => `![${alt || "图片"}](${url})`)
          .join("\n\n");
        const selection = this.editor.getSelection();
        if (selection) {
          this.editor.executeEdits("insert-images", [
            {
              range: selection,
              text: imageMarkdown,
            },
          ]);
          // 移动光标到插入内容之后
          const newPosition = {
            lineNumber: selection.startLineNumber,
            column: selection.startColumn + imageMarkdown.length,
          };
          this.editor.setPosition(newPosition);
        }
        break;
      }

      case "editImage": {
        // Monaco 编辑器中编辑图片 alt 文本
        const { alt } = params as { alt: string };
        const selection = this.editor.getSelection();
        if (selection) {
          const model = this.editor.getModel();
          if (model) {
            const lineContent = model.getLineContent(selection.startLineNumber);
            // 匹配 Markdown 图片语法 ![alt](url)
            const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            let match;
            while ((match = imageRegex.exec(lineContent)) !== null) {
              const matchStart = match.index;
              const matchEnd = matchStart + match[0].length;
              // 检查光标是否在这个图片标记内
              if (
                selection.startColumn > matchStart &&
                selection.startColumn <= matchEnd
              ) {
                const newImageMarkdown = `![${alt}](${match[2]})`;
                this.editor.executeEdits("edit-image-alt", [
                  {
                    range: {
                      startLineNumber: selection.startLineNumber,
                      startColumn: matchStart + 1,
                      endLineNumber: selection.startLineNumber,
                      endColumn: matchEnd + 1,
                    },
                    text: newImageMarkdown,
                  },
                ]);
                break;
              }
            }
          }
        }
        break;
      }

      case "setCodeBlockLanguage": {
        const { language } = params as { language: string };
        monacoHelpers.setCodeBlockLanguage(this.editor, language);
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
