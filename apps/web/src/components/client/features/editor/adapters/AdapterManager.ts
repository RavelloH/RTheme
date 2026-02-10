/**
 * 编辑器适配器管理器
 *
 * 统一管理四种编辑器适配器，实现：
 * 1. 适配器的创建和销毁
 * 2. 编辑器类型切换时的内容同步
 * 3. 统一的命令执行接口
 * 4. 状态同步和事件分发
 */

import {
  HTMLAdapter,
  MarkdownAdapter,
  MDXAdapter,
} from "@/components/client/features/editor/adapters/MonacoAdapters";
import { TiptapAdapter } from "@/components/client/features/editor/adapters/TiptapAdapter";
import type {
  AdapterConfig,
  AdapterManagerEvents,
  CommandWithParams,
  EditorCommand,
  EditorState,
  EditorType,
  IEditorAdapter,
  MonacoInstance,
  TiptapInstance,
} from "@/components/client/features/editor/adapters/types";

/**
 * 适配器管理器类
 */
export class AdapterManager {
  private currentAdapter: IEditorAdapter | null = null;
  private currentType: EditorType | null = null;
  private config: AdapterConfig;
  private events: AdapterManagerEvents;

  // 存储上一次的内容，用于编辑器切换时同步
  private lastContent: string = "";

  constructor(config: AdapterConfig, events?: AdapterManagerEvents) {
    this.config = config;
    this.events = events || {};
  }

  /**
   * 注册 Tiptap 编辑器
   */
  registerTiptapEditor(editor: TiptapInstance): void {
    this.switchAdapter("visual", () => new TiptapAdapter(editor, this.config));
  }

  /**
   * 注册 Monaco Markdown 编辑器
   */
  registerMarkdownEditor(editor: MonacoInstance): void {
    this.switchAdapter(
      "markdown",
      () => new MarkdownAdapter(editor, this.config),
    );
  }

  /**
   * 注册 Monaco MDX 编辑器
   */
  registerMDXEditor(editor: MonacoInstance): void {
    this.switchAdapter("mdx", () => new MDXAdapter(editor, this.config));
  }

  /**
   * 注册 Monaco HTML 编辑器
   */
  registerHTMLEditor(editor: MonacoInstance): void {
    this.switchAdapter("html", () => new HTMLAdapter(editor, this.config));
  }

  /**
   * 切换适配器
   *
   * @param type 新的编辑器类型
   * @param createAdapter 创建新适配器的工厂函数
   */
  private switchAdapter(
    type: EditorType,
    createAdapter: () => IEditorAdapter,
  ): void {
    // 如果是同一个类型，不需要切换
    if (this.currentType === type && this.currentAdapter) {
      return;
    }

    // 保存当前内容
    if (this.currentAdapter) {
      this.lastContent = this.currentAdapter.getContent();
    }

    // 销毁旧适配器
    if (this.currentAdapter) {
      this.currentAdapter.destroy();
    }

    // 创建新适配器
    this.currentAdapter = createAdapter();
    this.currentType = type;

    // 设置内容（如果有）
    if (this.lastContent) {
      this.currentAdapter.setContent(this.lastContent);
    }

    // 设置事件监听
    this.setupAdapterListeners();

    // 触发事件
    this.events.onTypeChange?.(type);
    this.events.onAdapterReady?.(this.currentAdapter);
  }

  /**
   * 设置适配器事件监听
   */
  private setupAdapterListeners(): void {
    if (!this.currentAdapter) return;

    this.currentAdapter.onStateChange((state) => {
      this.events.onStateChange?.(state);
    });

    this.currentAdapter.onContentChange((content) => {
      this.lastContent = content;
      this.events.onContentChange?.(content);
    });
  }

  /**
   * 获取当前适配器
   */
  getCurrentAdapter(): IEditorAdapter | null {
    return this.currentAdapter;
  }

  /**
   * 获取当前编辑器类型
   */
  getCurrentType(): EditorType | null {
    return this.currentType;
  }

  /**
   * 获取当前编辑器状态
   */
  getState(): EditorState | null {
    return this.currentAdapter?.getState() || null;
  }

  /**
   * 获取编辑器内容
   */
  getContent(): string {
    return this.currentAdapter?.getContent() || "";
  }

  /**
   * 设置编辑器内容
   */
  setContent(content: string): void {
    this.currentAdapter?.setContent(content);
    this.lastContent = content;
  }

  /**
   * 获取选中的文本
   */
  getSelectedText(): string {
    return this.currentAdapter?.getSelectedText() || "";
  }

  /**
   * 聚焦编辑器
   */
  focus(): void {
    this.currentAdapter?.focus();
  }

  /**
   * 执行命令
   */
  executeCommand(command: EditorCommand): void {
    this.currentAdapter?.executeCommand(command);
  }

  /**
   * 执行带参数的命令
   */
  executeCommandWithParams<K extends keyof CommandWithParams>(
    command: K,
    params: CommandWithParams[K],
  ): void {
    console.log("AdapterManager: executeCommandWithParams", {
      command,
      params,
      hasAdapter: !!this.currentAdapter,
      adapterType: this.currentType,
    });
    this.currentAdapter?.executeCommandWithParams(command, params);
  }

  /**
   * 批量执行命令
   *
   * 用于工具栏批量操作
   */
  executeBatchCommands(commands: EditorCommand[]): void {
    commands.forEach((command) => {
      this.executeCommand(command);
    });
  }

  /**
   * 注册状态变化监听器
   */
  onStateChange(callback: (state: EditorState) => void): () => void {
    const originalCallback = this.events.onStateChange;
    this.events.onStateChange = (state) => {
      originalCallback?.(state);
      callback(state);
    };
    return () => {
      this.events.onStateChange = originalCallback;
    };
  }

  /**
   * 注册内容变化监听器
   */
  onContentChange(callback: (content: string) => void): () => void {
    const originalCallback = this.events.onContentChange;
    this.events.onContentChange = (content) => {
      originalCallback?.(content);
      callback(content);
    };
    return () => {
      this.events.onContentChange = originalCallback;
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    if (this.currentAdapter) {
      this.currentAdapter.destroy();
    }
    this.currentAdapter = null;
    this.currentType = null;
    this.lastContent = "";
  }
}

/**
 * 创建适配器管理器实例
 *
 * @param config 适配器配置
 * @param events 事件回调
 * @returns 适配器管理器实例
 */
export function createAdapterManager(
  config: AdapterConfig,
  events?: AdapterManagerEvents,
): AdapterManager {
  return new AdapterManager(config, events);
}
