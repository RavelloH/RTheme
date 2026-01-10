/**
 * 自定义 Paragraph 扩展
 *
 * 支持文本对齐属性，并在 Markdown 序列化时输出对齐的 <p> 标签
 */

import Paragraph from "@tiptap/extension-paragraph";
import type { JSONContent } from "@tiptap/react";

export const CustomParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: "left",
        parseHTML: (element: HTMLElement) => element.style.textAlign || "left",
        renderHTML: (attributes: { textAlign?: string }) => {
          if (!attributes.textAlign || attributes.textAlign === "left") {
            return {};
          }
          return {
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
    };
  },

  renderMarkdown(
    node: JSONContent,
    helpers: {
      renderChildren: (nodes: JSONContent | JSONContent[]) => string;
    },
  ) {
    const align = node.attrs?.textAlign;
    const content = helpers.renderChildren(node.content || []);

    // 左对齐或无对齐：使用标准段落格式
    if (!align || align === "left") {
      return content;
    }

    // 其他对齐：使用 <p> 标签包裹
    return `<p style="text-align: ${align};">${content}</p>`;
  },
});
