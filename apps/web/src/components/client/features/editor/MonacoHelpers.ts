import type { editor } from "monaco-editor";

/**
 * Monaco编辑器的Markdown文本操作工具函数
 */

/**
 * 在选中文本前后包裹字符
 */
export function wrapSelection(
  editor: editor.IStandaloneCodeEditor,
  before: string,
  after: string = before,
) {
  const model = editor.getModel();
  if (!model) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const selectedText = model.getValueInRange(selection);

  if (selectedText) {
    // 有选中文本,包裹它
    editor.executeEdits("", [
      {
        range: selection,
        text: `${before}${selectedText}${after}`,
      },
    ]);

    // 重新选中被包裹的文本
    editor.setSelection({
      startLineNumber: selection.startLineNumber,
      startColumn: selection.startColumn + before.length,
      endLineNumber: selection.endLineNumber,
      endColumn: selection.endColumn + before.length,
    });
  } else {
    // 没有选中文本,插入包裹符并将光标定位在中间
    editor.executeEdits("", [
      {
        range: selection,
        text: `${before}${after}`,
      },
    ]);

    editor.setPosition({
      lineNumber: selection.startLineNumber,
      column: selection.startColumn + before.length,
    });
  }

  editor.focus();
}

/**
 * 在行首添加或切换前缀
 */
export function toggleLinePrefix(
  editor: editor.IStandaloneCodeEditor,
  prefix: string,
) {
  const model = editor.getModel();
  if (!model) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const edits: editor.IIdentifiedSingleEditOperation[] = [];

  // 处理选中的所有行
  for (
    let lineNumber = selection.startLineNumber;
    lineNumber <= selection.endLineNumber;
    lineNumber++
  ) {
    const lineContent = model.getLineContent(lineNumber);

    if (lineContent.trimStart().startsWith(prefix)) {
      // 移除前缀
      const prefixIndex = lineContent.indexOf(prefix);
      edits.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: prefixIndex + 1,
          endLineNumber: lineNumber,
          endColumn: prefixIndex + prefix.length + 1,
        },
        text: "",
      });
    } else {
      // 添加前缀
      const firstNonWhitespace = lineContent.search(/\S/);
      const insertColumn = firstNonWhitespace >= 0 ? firstNonWhitespace + 1 : 1;

      edits.push({
        range: {
          startLineNumber: lineNumber,
          startColumn: insertColumn,
          endLineNumber: lineNumber,
          endColumn: insertColumn,
        },
        text: prefix,
      });
    }
  }

  editor.executeEdits("", edits);
  editor.focus();
}

/**
 * 设置标题级别
 */
export function setHeading(
  editor: editor.IStandaloneCodeEditor,
  level: number,
) {
  const model = editor.getModel();
  if (!model) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const lineNumber = selection.startLineNumber;
  const lineContent = model.getLineContent(lineNumber);

  // 移除现有的标题标记
  const withoutHeading = lineContent.replace(/^#{1,6}\s*/, "");

  // 添加新的标题标记
  const newContent = `${"#".repeat(level)} ${withoutHeading}`;

  editor.executeEdits("", [
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

  editor.focus();
}

/**
 * 插入图片
 */
export function insertImage(
  editor: editor.IStandaloneCodeEditor,
  url: string,
  alt: string = "图片",
) {
  const selection = editor.getSelection();
  if (!selection) return;

  const text = `![${alt}](${url})`;

  editor.executeEdits("", [
    {
      range: selection,
      text,
    },
  ]);

  editor.focus();
}

/**
 * 插入分隔线
 */
export function insertHorizontalRule(editor: editor.IStandaloneCodeEditor) {
  const model = editor.getModel();
  if (!model) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const lineNumber = selection.startLineNumber;
  const lineContent = model.getLineContent(lineNumber);

  // 在当前行后插入分隔线
  editor.executeEdits("", [
    {
      range: {
        startLineNumber: lineNumber,
        startColumn: lineContent.length + 1,
        endLineNumber: lineNumber,
        endColumn: lineContent.length + 1,
      },
      text: "\n\n---\n\n",
    },
  ]);

  editor.setPosition({
    lineNumber: lineNumber + 4,
    column: 1,
  });

  editor.focus();
}

/**
 * 插入代码块
 */
export function insertCodeBlock(
  editor: editor.IStandaloneCodeEditor,
  language: string = "",
) {
  const selection = editor.getSelection();
  if (!selection) return;

  const selectedText = editor.getModel()?.getValueInRange(selection) || "";
  const text = `\`\`\`${language}\n${selectedText}\n\`\`\``;

  editor.executeEdits("", [
    {
      range: selection,
      text,
    },
  ]);

  // 将光标定位在代码块内
  editor.setPosition({
    lineNumber: selection.startLineNumber + 1,
    column: 1,
  });

  editor.focus();
}

/**
 * 设置当前代码块的语言
 */
export function setCodeBlockLanguage(
  editor: editor.IStandaloneCodeEditor,
  language: string,
) {
  const model = editor.getModel();
  if (!model) return;

  const position = editor.getPosition();
  if (!position) return;

  // 向上查找代码块开始标记
  let startLine = -1;
  for (let i = position.lineNumber; i >= 1; i--) {
    const lineContent = model.getLineContent(i);
    if (lineContent.startsWith("```")) {
      startLine = i;
      break;
    }
  }

  if (startLine === -1) {
    console.warn("Not inside a code block");
    return;
  }

  // 向下查找代码块结束标记（确认这确实是一个有效的代码块）
  let endLine = -1;
  for (let i = startLine + 1; i <= model.getLineCount(); i++) {
    const lineContent = model.getLineContent(i);
    if (lineContent.startsWith("```")) {
      endLine = i;
      break;
    }
  }

  if (endLine === -1) {
    console.warn("Code block not closed");
    return;
  }

  // 检查光标是否在这个代码块内
  if (position.lineNumber < startLine || position.lineNumber > endLine) {
    console.warn("Not inside a code block");
    return;
  }

  // 获取开始行的内容并替换语言标识符
  const startLineContent = model.getLineContent(startLine);
  const newStartLineContent = `\`\`\`${language}`;

  editor.executeEdits("", [
    {
      range: {
        startLineNumber: startLine,
        startColumn: 1,
        endLineNumber: startLine,
        endColumn: startLineContent.length + 1,
      },
      text: newStartLineContent,
    },
  ]);

  editor.focus();
}

/**
 * 插入链接
 */
export function insertLink(
  editor: editor.IStandaloneCodeEditor,
  url: string,
  text?: string,
) {
  const model = editor.getModel();
  if (!model) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const selectedText = model.getValueInRange(selection);
  const linkText = text || selectedText || url;
  const linkMarkdown = `[${linkText}](${url})`;

  editor.executeEdits("", [
    {
      range: selection,
      text: linkMarkdown,
    },
  ]);

  editor.focus();
}

/**
 * 插入表格
 */
export function insertTable(
  editor: editor.IStandaloneCodeEditor,
  rows: number,
  cols: number,
) {
  const model = editor.getModel();
  if (!model) return;

  const selection = editor.getSelection();
  if (!selection) return;

  // 生成表格Markdown
  let tableMarkdown = "\n";

  // 表头
  tableMarkdown += "|";
  for (let i = 0; i < cols; i++) {
    tableMarkdown += ` 列${i + 1} |`;
  }
  tableMarkdown += "\n";

  // 分隔线
  tableMarkdown += "|";
  for (let i = 0; i < cols; i++) {
    tableMarkdown += " --- |";
  }
  tableMarkdown += "\n";

  // 数据行
  for (let i = 0; i < rows - 1; i++) {
    tableMarkdown += "|";
    for (let j = 0; j < cols; j++) {
      tableMarkdown += "  |";
    }
    tableMarkdown += "\n";
  }

  tableMarkdown += "\n";

  editor.executeEdits("", [
    {
      range: selection,
      text: tableMarkdown,
    },
  ]);

  editor.focus();
}

/**
 * 设置文本对齐（使用HTML div）
 */
export function setTextAlign(
  editor: editor.IStandaloneCodeEditor,
  align: "left" | "center" | "right",
) {
  const model = editor.getModel();
  if (!model) return;

  const selection = editor.getSelection();
  if (!selection) return;

  const selectedText = model.getValueInRange(selection) || "在此输入文本";

  const alignedText = `<div style="text-align: ${align}">\n${selectedText}\n</div>`;

  editor.executeEdits("", [
    {
      range: selection,
      text: alignedText,
    },
  ]);

  editor.focus();
}
