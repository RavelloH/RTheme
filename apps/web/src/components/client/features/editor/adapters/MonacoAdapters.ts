/**
 * Markdown/MDX/HTML 编辑器适配器
 *
 * 继承自 BaseMonacoAdapter，提供文本编辑器特定功能
 */

import { BaseMonacoAdapter } from "@/components/client/features/editor/adapters/BaseMonacoAdapter";
import type {
  AdapterConfig,
  CommandWithParams,
  EditorCommand,
  MonacoInstance,
} from "@/components/client/features/editor/adapters/types";
import * as monacoHelpers from "@/components/client/features/editor/MonacoHelpers";

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

/**
 * HTML 编辑器适配器
 */
export class HTMLAdapter extends BaseMonacoAdapter {
  readonly type = "html" as const;

  constructor(editor: MonacoInstance, config: AdapterConfig) {
    super(editor, config);
  }

  /**
   * HTML 模式下优先输出 HTML 语法
   */
  executeCommand(command: EditorCommand): void {
    const htmlCommandMap: Partial<Record<EditorCommand, () => void>> = {
      bold: () =>
        monacoHelpers.wrapSelection(this.editor, "<strong>", "</strong>"),
      italic: () => monacoHelpers.wrapSelection(this.editor, "<em>", "</em>"),
      strike: () => monacoHelpers.wrapSelection(this.editor, "<del>", "</del>"),
      underline: () => monacoHelpers.wrapSelection(this.editor, "<u>", "</u>"),
      highlight: () =>
        monacoHelpers.wrapSelection(this.editor, "<mark>", "</mark>"),
      code: () => monacoHelpers.wrapSelection(this.editor, "<code>", "</code>"),
      superscript: () =>
        monacoHelpers.wrapSelection(this.editor, "<sup>", "</sup>"),
      subscript: () =>
        monacoHelpers.wrapSelection(this.editor, "<sub>", "</sub>"),
      blockquote: () =>
        monacoHelpers.wrapSelection(
          this.editor,
          "<blockquote>\n",
          "\n</blockquote>",
        ),
      codeBlock: () => this.insertHtmlCodeBlock(),
      horizontalRule: () => this.insertHtmlHorizontalRule(),
      bulletList: () => this.insertHtmlList("ul"),
      orderedList: () => this.insertHtmlList("ol"),
      taskList: () => this.insertHtmlTaskList(),
      alignLeft: () => monacoHelpers.setTextAlign(this.editor, "left"),
      alignCenter: () => monacoHelpers.setTextAlign(this.editor, "center"),
      alignRight: () => monacoHelpers.setTextAlign(this.editor, "right"),
    };

    const handler = htmlCommandMap[command];
    if (handler) {
      handler();
      return;
    }

    super.executeCommand(command);
  }

  /**
   * HTML 模式下参数命令同样优先输出 HTML 语法
   */
  executeCommandWithParams<K extends keyof CommandWithParams>(
    command: K,
    params: CommandWithParams[K],
  ): void {
    switch (command) {
      case "heading": {
        const { level } = params as { level: 1 | 2 | 3 | 4 | 5 | 6 };
        this.setHtmlHeading(level);
        return;
      }
      case "insertTable": {
        const { rows, cols } = params as { rows: number; cols: number };
        this.insertHtmlTable(rows, cols);
        return;
      }
      case "insertLink": {
        const { text, url } = params as { text: string; url: string };
        this.insertHtmlLink(url, text);
        return;
      }
      case "editLink": {
        const { url } = params as { url: string };
        const selectedText = this.getSelectedText();
        this.insertHtmlLink(url, selectedText || url);
        return;
      }
      case "insertImage": {
        const { url, alt } = params as { url: string; alt?: string };
        this.insertHtmlImage(url, alt || "图片");
        return;
      }
      case "insertImages": {
        const { urls, alt } = params as { urls: string[]; alt?: string };
        this.insertHtmlImages(urls, alt || "图片");
        return;
      }
      case "editImage": {
        const { alt } = params as { alt: string };
        this.editCurrentHtmlImageAlt(alt);
        return;
      }
      case "setCodeBlockLanguage": {
        const { language } = params as { language: string };
        this.setCurrentHtmlCodeBlockLanguage(language);
        return;
      }
      default:
        super.executeCommandWithParams(command, params);
    }
  }

  private replaceSelection(text: string): void {
    const selection = this.editor.getSelection();
    if (!selection) return;

    this.editor.executeEdits("html-adapter", [
      {
        range: selection,
        text,
      },
    ]);
    this.editor.focus();
  }

  private escapeHtmlAttribute(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  }

  private setHtmlHeading(level: 1 | 2 | 3 | 4 | 5 | 6): void {
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!model || !selection) return;

    const lineNumber = selection.startLineNumber;
    const lineContent = model.getLineContent(lineNumber);
    const withoutMarkdownHeading = lineContent.replace(/^#{1,6}\s*/, "");
    const withoutHtmlHeading = withoutMarkdownHeading.replace(
      /^<h[1-6][^>]*>([\s\S]*)<\/h[1-6]>\s*$/i,
      "$1",
    );
    const newContent = `<h${level}>${withoutHtmlHeading}</h${level}>`;

    this.editor.executeEdits("html-heading", [
      {
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: lineContent.length + 1,
        },
        text: newContent,
      },
    ]);
    this.editor.focus();
  }

  private insertHtmlHorizontalRule(): void {
    const selection = this.editor.getSelection();
    if (!selection) return;

    this.editor.executeEdits("html-horizontal-rule", [
      {
        range: selection,
        text: "\n\n<hr />\n\n",
      },
    ]);
    this.editor.focus();
  }

  private insertHtmlCodeBlock(language: string = ""): void {
    const selectedText = this.getSelectedText();
    const languageClass = language
      ? ` class="language-${this.escapeHtmlAttribute(language)}"`
      : "";
    const text = `<pre><code${languageClass}>\n${selectedText}\n</code></pre>`;
    this.replaceSelection(text);
  }

  private insertHtmlList(listType: "ul" | "ol"): void {
    const selectedText = this.getSelectedText();
    const rawItems = selectedText ? selectedText.split(/\r?\n/) : ["列表项"];
    const items = rawItems
      .map((line) => line.replace(/^[\s]*([-*+]|\d+\.)\s+/, "").trim())
      .filter(Boolean);

    if (items.length === 0) {
      items.push("列表项");
    }

    const listText = [
      `<${listType}>`,
      ...items.map((item) => `  <li>${item}</li>`),
      `</${listType}>`,
    ].join("\n");

    this.replaceSelection(listText);
  }

  private insertHtmlTaskList(): void {
    const selectedText = this.getSelectedText();
    const rawItems = selectedText ? selectedText.split(/\r?\n/) : ["任务项"];
    const items = rawItems
      .map((line) => line.replace(/^[\s]*-\s\[[\sxX]\]\s*/, "").trim())
      .filter(Boolean);

    if (items.length === 0) {
      items.push("任务项");
    }

    const taskList = [
      '<ul class="task-list">',
      ...items.map(
        (item) => `  <li><input type="checkbox" disabled /> ${item}</li>`,
      ),
      "</ul>",
    ].join("\n");

    this.replaceSelection(taskList);
  }

  private insertHtmlLink(url: string, text?: string): void {
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!model || !selection) return;

    const selectedText = model.getValueInRange(selection);
    const linkText = text || selectedText || url;
    const linkHtml = `<a href="${this.escapeHtmlAttribute(url)}">${linkText}</a>`;

    this.editor.executeEdits("html-link", [
      {
        range: selection,
        text: linkHtml,
      },
    ]);
    this.editor.focus();
  }

  private insertHtmlImage(url: string, alt: string = "图片"): void {
    const imageHtml = `<img src="${this.escapeHtmlAttribute(url)}" alt="${this.escapeHtmlAttribute(alt)}" />`;
    this.replaceSelection(imageHtml);
  }

  private insertHtmlImages(urls: string[], alt: string = "图片"): void {
    const imagesHtml = urls
      .map(
        (url) =>
          `<img src="${this.escapeHtmlAttribute(url)}" alt="${this.escapeHtmlAttribute(alt)}" />`,
      )
      .join("\n");
    this.replaceSelection(imagesHtml);
  }

  private editCurrentHtmlImageAlt(alt: string): void {
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!model || !selection) return;

    const lineNumber = selection.startLineNumber;
    const lineContent = model.getLineContent(lineNumber);
    const cursorIndex = selection.startColumn - 1;

    const imageRegex = /<img\b[^>]*>/gi;
    let match: RegExpExecArray | null = null;

    while ((match = imageRegex.exec(lineContent)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      if (cursorIndex >= start && cursorIndex <= end) {
        const updatedTag = this.upsertHtmlImageAltAttribute(match[0], alt);
        this.editor.executeEdits("html-edit-image-alt", [
          {
            range: {
              startLineNumber: lineNumber,
              startColumn: start + 1,
              endLineNumber: lineNumber,
              endColumn: end + 1,
            },
            text: updatedTag,
          },
        ]);
        this.editor.focus();
        return;
      }
    }
  }

  private upsertHtmlImageAltAttribute(tag: string, alt: string): string {
    const escapedAlt = this.escapeHtmlAttribute(alt);
    const altAttrRegex = /\balt\s*=\s*(".*?"|'.*?')/i;

    if (altAttrRegex.test(tag)) {
      return tag.replace(altAttrRegex, `alt="${escapedAlt}"`);
    }

    return tag.replace(/\s*\/?>$/, (ending) => ` alt="${escapedAlt}"${ending}`);
  }

  private insertHtmlTable(rows: number, cols: number): void {
    const safeRows = Math.max(1, rows);
    const safeCols = Math.max(1, cols);
    const bodyRows = Math.max(1, safeRows - 1);

    const headerRow = createArray(safeCols)
      .map((_, index) => `      <th>列${index + 1}</th>`)
      .join("\n");

    const bodyContent = createArray(bodyRows)
      .map(
        () =>
          `    <tr>\n${createArray(safeCols)
            .map(() => "      <td></td>")
            .join("\n")}\n    </tr>`,
      )
      .join("\n");

    const tableHtml = [
      "<table>",
      "  <thead>",
      "    <tr>",
      headerRow,
      "    </tr>",
      "  </thead>",
      "  <tbody>",
      bodyContent,
      "  </tbody>",
      "</table>",
    ].join("\n");

    this.replaceSelection(tableHtml);
  }

  private setCurrentHtmlCodeBlockLanguage(language: string): void {
    const model = this.editor.getModel();
    const position = this.editor.getPosition();
    if (!model || !position) return;

    const content = model.getValue();
    const cursorOffset = model.getOffsetAt(position);
    const codeOpenRegex = /<code\b[^>]*>/gi;
    let match: RegExpExecArray | null = null;
    let target: {
      startOffset: number;
      endOffset: number;
      tag: string;
    } | null = null;

    while ((match = codeOpenRegex.exec(content)) !== null) {
      const startOffset = match.index;
      const endOffset = startOffset + match[0].length;
      const closeIndex = content.indexOf("</code>", endOffset);
      if (closeIndex === -1) continue;

      if (cursorOffset >= startOffset && cursorOffset <= closeIndex + 7) {
        target = {
          startOffset,
          endOffset,
          tag: match[0],
        };
        break;
      }
    }

    if (!target) {
      this.insertHtmlCodeBlock(language);
      return;
    }

    const updatedTag = this.upsertCodeTagLanguageClass(target.tag, language);
    if (updatedTag === target.tag) {
      return;
    }

    const startPos = model.getPositionAt(target.startOffset);
    const endPos = model.getPositionAt(target.endOffset);
    this.editor.executeEdits("html-code-language", [
      {
        range: {
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        },
        text: updatedTag,
      },
    ]);
    this.editor.focus();
  }

  private upsertCodeTagLanguageClass(tag: string, language: string): string {
    const classMatch = tag.match(/\bclass\s*=\s*("([^"]*)"|'([^']*)')/i);
    const normalizedLanguage = language.trim();

    if (classMatch) {
      const rawClassValue = classMatch[2] ?? classMatch[3] ?? "";
      const preservedClasses = rawClassValue
        .split(/\s+/)
        .filter(Boolean)
        .filter((className) => !className.startsWith("language-"));

      if (normalizedLanguage) {
        preservedClasses.push(`language-${normalizedLanguage}`);
      }

      const replacement = `class="${preservedClasses.join(" ")}"`;
      return tag.replace(classMatch[0], replacement);
    }

    if (!normalizedLanguage) {
      return tag;
    }

    return tag.replace(/>$/, ` class="language-${normalizedLanguage}">`);
  }
}

function createArray(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index);
}
