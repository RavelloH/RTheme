import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import type { JSONContent } from "@tiptap/core";

/**
 * 自定义表格扩展，支持 Markdown 导出时的列对齐
 */
export const TableWithMarkdown = Table.extend({
  renderMarkdown(node, helpers) {
    if (!node.content || node.content.length === 0) {
      return "";
    }

    // 收集所有列的对齐方式（从第一行获取）
    const columnAlignments: Array<"left" | "center" | "right" | null> = [];

    const firstRow = node.content[0];
    if (firstRow && firstRow.content) {
      firstRow.content.forEach((cell: JSONContent) => {
        columnAlignments.push(
          (cell.attrs?.textAlign as "left" | "center" | "right") || null,
        );
      });
    }

    // 渲染所有行
    const rows: string[] = [];
    node.content.forEach((row: JSONContent, rowIndex: number) => {
      if (!row.content) return;

      const cells: string[] = [];
      row.content.forEach((cell: JSONContent) => {
        // 渲染单元格内的行内内容
        const cellContent = helpers.renderChildren(cell.content || []);
        cells.push(cellContent || " ");
      });
      rows.push(`| ${cells.join(" | ")} |`);

      // 在第一行（表头）后添加分隔行，包含对齐标记
      if (rowIndex === 0) {
        const separators = columnAlignments.map((align) => {
          if (align === "center") {
            return ":------:";
          } else if (align === "right") {
            return "-------:";
          } else {
            // left 或 null 都使用左对齐（无标记）
            return "--------";
          }
        });
        rows.push(`| ${separators.join(" | ")} |`);
      }
    });

    return rows.join("\n");
  },
});

/**
 * 自定义 TableCell 扩展，添加对齐属性
 */
export const TableCellWithMarkdown = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: (element) => element.style.textAlign || null,
        renderHTML: (attributes) => {
          if (!attributes.textAlign) {
            return {};
          }
          return {
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
    };
  },
});

/**
 * 自定义 TableHeader 扩展，添加对齐属性
 */
export const TableHeaderWithMarkdown = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: (element) => element.style.textAlign || null,
        renderHTML: (attributes) => {
          if (!attributes.textAlign) {
            return {};
          }
          return {
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
    };
  },
});

/**
 * 自定义 TableRow 扩展
 */
export const TableRowWithMarkdown = TableRow;
