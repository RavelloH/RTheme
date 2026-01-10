/**
 * 自定义下划线扩展
 *
 * 完全重写的下划线扩展，使用 <u> HTML 标签而不是 ++ 语法
 */

import { Mark, mergeAttributes } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";

export const CustomUnderline = Mark.create({
  name: "underline",

  // 提高优先级
  priority: 2000,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: "u",
      },
      {
        style: "text-decoration",
        consuming: false,
        getAttrs: (style) =>
          (style as string).includes("underline") ? {} : false,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "u",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  // Markdown 解析：支持 ++ 和 <u> 两种语法
  parseMarkdown(token: any, helpers: any) {
    return helpers.applyMark(
      this.name || "underline",
      helpers.parseInline(token.tokens || []),
    );
  },

  // Markdown 序列化：使用 <u> 标签
  renderMarkdown(
    node: JSONContent,
    helpers: {
      renderChildren: (nodes: JSONContent | JSONContent[]) => string;
    },
  ) {
    const content = helpers.renderChildren(node.content || []);
    return `<u>${content}</u>`;
  },

  // Markdown tokenizer：解析 ++ 和 <u> 语法
  markdownTokenizer: {
    name: "underline",
    level: "inline" as const,
    start(src: string) {
      const plusIndex = src.indexOf("++");
      const htmlIndex = src.indexOf("<u>");
      if (plusIndex === -1) return htmlIndex;
      if (htmlIndex === -1) return plusIndex;
      return Math.min(plusIndex, htmlIndex);
    },
    tokenize(src: string, _tokens: unknown, lexer: any) {
      // 尝试匹配 <u> 标签
      const htmlRule = /^<u>([^<]+)<\/u>/;
      let match = htmlRule.exec(src);

      if (match) {
        const innerContent = match[1] || "";
        return {
          type: "underline",
          raw: match[0],
          text: innerContent,
          tokens: lexer.inlineTokens(innerContent),
        };
      }

      // 尝试匹配 ++ 语法
      const plusRule = /^(\+\+)([\s\S]+?)(\+\+)/;
      match = plusRule.exec(src);

      if (!match) {
        return undefined;
      }

      const innerContent = match[2]?.trim() || "";
      return {
        type: "underline",
        raw: match[0],
        text: innerContent,
        tokens: lexer.inlineTokens(innerContent),
      };
    },
  },

  addCommands() {
    return {
      setUnderline:
        () =>
        ({ commands }) => {
          return commands.setMark(this.name);
        },
      toggleUnderline:
        () =>
        ({ commands }) => {
          return commands.toggleMark(this.name);
        },
      unsetUnderline:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-u": () => this.editor.commands.toggleUnderline(),
      "Mod-U": () => this.editor.commands.toggleUnderline(),
    };
  },
});
