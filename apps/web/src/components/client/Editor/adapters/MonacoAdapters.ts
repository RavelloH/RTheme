/**
 * Markdown 和 MDX 编辑器适配器
 *
 * 继承自 BaseMonacoAdapter，提供 Markdown 和 MDX 特定功能
 */

import { BaseMonacoAdapter } from "@/components/client/Editor/adapters/BaseMonacoAdapter";
import type {
  AdapterConfig,
  MonacoInstance,
} from "@/components/client/Editor/adapters/types";

/**
 * Markdown 编辑器适配器
 */
export class MarkdownAdapter extends BaseMonacoAdapter {
  readonly type = "markdown" as const;

  constructor(editor: MonacoInstance, config: AdapterConfig) {
    super(editor, config);
  }

  // Markdown 特定的功能可以在这里扩展
  // 目前使用基类的所有功能
}

/**
 * MDX 编辑器适配器
 */
export class MDXAdapter extends BaseMonacoAdapter {
  readonly type = "mdx" as const;

  constructor(editor: MonacoInstance, config: AdapterConfig) {
    super(editor, config);
  }

  // MDX 特定的功能可以在这里扩展
  // 例如：JSX 组件插入、Props 编辑等
  // 目前使用基类的所有功能
}
