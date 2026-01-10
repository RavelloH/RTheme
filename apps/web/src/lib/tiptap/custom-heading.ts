/**
 * 自定义 Heading 扩展
 *
 * 支持文本对齐属性，并在 Markdown 序列化时输出对齐的 <h1-h6> 标签
 * 自动生成 ID 用于目录跳转
 */

import Heading from "@tiptap/extension-heading";
import type { JSONContent } from "@tiptap/react";
import { createHeadingProcessor } from "@/lib/shared/heading-utils";

export const CustomHeading = Heading.extend({
  // 使用 storage 在整个编辑器中共享 processor
  addStorage() {
    return {
      headingProcessor: createHeadingProcessor(),
    };
  },

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
      id: {
        default: null,
        parseHTML: (element: HTMLElement) => element.id || null,
        renderHTML: (attributes: { id?: string }) => {
          if (!attributes.id) {
            return {};
          }
          return {
            id: attributes.id,
          };
        },
      },
    };
  },

  // 在渲染到 DOM 时自动生成 ID
  addNodeView() {
    return ({ node, HTMLAttributes, editor }) => {
      const level = node.attrs.level || 1;
      const dom = document.createElement(`h${level}`);
      const contentDOM = dom;

      // 使用共享的 processor 生成 ID
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processor = (editor.storage as any)[this.name]?.headingProcessor;
      const text = node.textContent || "";
      const id = processor ? processor.generateSlug(text) : "";

      // 应用所有属性
      Object.entries(HTMLAttributes).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          dom.setAttribute(key, String(value));
        }
      });

      // 设置生成的 ID
      if (id) {
        dom.id = id;
      }

      return {
        dom,
        contentDOM,
      };
    };
  },

  onCreate() {
    // 编辑器创建时重置计数器
    this.storage.headingProcessor?.reset();
  },

  onUpdate() {
    // 每次更新时重置计数器，确保重新生成所有 ID
    this.storage.headingProcessor?.reset();
  },

  renderMarkdown(
    node: JSONContent,
    helpers: {
      renderChildren: (nodes: JSONContent | JSONContent[]) => string;
    },
  ) {
    const level = node.attrs?.level || 1;
    const align = node.attrs?.textAlign;
    const content = helpers.renderChildren(node.content || []);
    const prefix = "#".repeat(level);

    // 左对齐或无对齐：使用标准 Markdown 标题
    if (!align || align === "left") {
      return `${prefix} ${content}`;
    }

    // 其他对齐：使用 HTML 标题标签
    return `<h${level} style="text-align: ${align};">${content}</h${level}>`;
  },
});
