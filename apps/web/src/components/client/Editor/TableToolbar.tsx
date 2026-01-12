"use client";

import { Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiDeleteBinLine,
  RiInsertColumnLeft,
  RiInsertColumnRight,
  RiInsertRowTop,
  RiInsertRowBottom,
  RiDeleteColumn,
  RiDeleteRow,
  RiTableLine,
  RiAlignLeft,
  RiAlignCenter,
  RiAlignRight,
} from "@remixicon/react";
import { Toggle } from "@/ui/Toggle";
import { Tooltip } from "@/ui/Tooltip";
import { AlertDialog } from "@/ui/AlertDialog";
import { useState } from "react";

interface TableToolbarProps {
  editor: Editor;
  isVisible: boolean;
}

export function TableToolbar({ editor, isVisible }: TableToolbarProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // 设置当前列的对齐方式
  const setColumnAlignment = (align: "left" | "center" | "right") => {
    const { state, view } = editor;
    const { selection } = state;

    // 保存当前光标位置
    const currentPos = selection.from;

    // 检查是否是单元格选择（CellSelection）
    const isCellSelection = selection.constructor.name === "CellSelection";

    // 多单元格选择时不执行对齐操作
    if (isCellSelection) {
      return;
    }

    // 单个单元格：更新整列
    const { $anchor } = selection;

    // 获取当前单元格的深度和列索引
    let cellDepth = 0;
    for (let d = $anchor.depth; d > 0; d--) {
      if (
        $anchor.node(d).type.name === "tableCell" ||
        $anchor.node(d).type.name === "tableHeader"
      ) {
        cellDepth = d;
        break;
      }
    }

    if (!cellDepth) return;

    // 获取表格节点和当前行
    const tableDepth = cellDepth - 2;
    const table = $anchor.node(tableDepth);

    // 计算当前列的索引
    let colIndex = 0;
    for (let i = 0; i < $anchor.index(cellDepth - 1); i++) {
      colIndex++;
    }

    // 创建事务来更新所有行中该列的单元格
    const { tr } = state;
    let updated = false;

    table.forEach((rowNode: ProseMirrorNode, rowOffset: number) => {
      if (rowNode.type.name === "tableRow") {
        let currentCol = 0;
        rowNode.forEach((cellNode: ProseMirrorNode, cellOffset: number) => {
          if (currentCol === colIndex) {
            const cellPos =
              $anchor.start(tableDepth) + rowOffset + cellOffset + 1;
            const cellType = cellNode.type;

            // 创建新的单元格节点，更新 textAlign 属性
            const newAttrs = { ...cellNode.attrs, textAlign: align };
            const newCell = cellType.create(
              newAttrs,
              cellNode.content,
              cellNode.marks,
            );

            tr.replaceWith(cellPos, cellPos + cellNode.nodeSize, newCell);
            updated = true;
          }
          currentCol++;
        });
      }
    });

    if (updated) {
      // 恢复光标位置
      try {
        const $pos = tr.doc.resolve(currentPos);
        const newSelection = TextSelection.near($pos);
        tr.setSelection(newSelection);
      } catch (e) {
        console.warn("Failed to restore cursor position:", e);
      }
      view.dispatch(tr);
    }
  };

  // 获取当前列的对齐方式
  const getCurrentColumnAlignment = (): "left" | "center" | "right" => {
    const { state } = editor;
    const { selection } = state;
    const { $anchor } = selection;

    // 查找当前单元格
    for (let d = $anchor.depth; d > 0; d--) {
      const node = $anchor.node(d);
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        return node.attrs.textAlign || "left";
      }
    }

    return "left";
  };

  const currentAlign = getCurrentColumnAlignment();

  // 检查是否为多单元格选择
  const isCellSelection =
    editor.state.selection.constructor.name === "CellSelection";

  const handleDeleteTable = () => {
    editor.chain().focus().deleteTable().run();
    setShowDeleteAlert(false);
  };

  const tableButtons = [
    {
      icon: <RiInsertColumnLeft size="1.2em" />,
      action: () => editor.chain().focus().addColumnBefore().run(),
      name: "在前面插入列",
      disabled: !editor.can().addColumnBefore(),
    },
    {
      icon: <RiInsertColumnRight size="1.2em" />,
      action: () => editor.chain().focus().addColumnAfter().run(),
      name: "在后面插入列",
      disabled: !editor.can().addColumnAfter(),
    },
    {
      icon: <RiDeleteColumn size="1.2em" />,
      action: () => editor.chain().focus().deleteColumn().run(),
      name: "删除列",
      disabled: !editor.can().deleteColumn(),
    },
    {
      icon: <RiAlignLeft size="1.2em" />,
      action: () => setColumnAlignment("left"),
      name: "列左对齐",
      disabled: isCellSelection,
      active: currentAlign === "left",
    },
    {
      icon: <RiAlignCenter size="1.2em" />,
      action: () => setColumnAlignment("center"),
      name: "列居中对齐",
      disabled: isCellSelection,
      active: currentAlign === "center",
    },
    {
      icon: <RiAlignRight size="1.2em" />,
      action: () => setColumnAlignment("right"),
      name: "列右对齐",
      disabled: isCellSelection,
      active: currentAlign === "right",
    },
    {
      icon: <RiInsertRowTop size="1.2em" />,
      action: () => editor.chain().focus().addRowBefore().run(),
      name: "在上方插入行",
      disabled: !editor.can().addRowBefore(),
    },
    {
      icon: <RiInsertRowBottom size="1.2em" />,
      action: () => editor.chain().focus().addRowAfter().run(),
      name: "在下方插入行",
      disabled: !editor.can().addRowAfter(),
    },
    {
      icon: <RiDeleteRow size="1.2em" />,
      action: () => editor.chain().focus().deleteRow().run(),
      name: "删除行",
      disabled: !editor.can().deleteRow(),
    },
    {
      icon: <RiTableLine size="1.2em" />,
      action: () => editor.chain().focus().toggleHeaderRow().run(),
      name: "开关表头行",
      disabled: !editor.can().toggleHeaderRow(),
    },
    {
      icon: <RiDeleteBinLine size="1.2em" className="text-error" />,
      action: () => setShowDeleteAlert(true),
      name: "删除表格",
      disabled: !editor.can().deleteTable(),
    },
  ];

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border border-foreground/10 rounded-lg shadow-lg px-3 py-2"
          >
            <div className="flex gap-1 items-center">
              {tableButtons.map((button, index) => (
                <Tooltip key={index} content={button.name}>
                  <Toggle
                    size="sm"
                    variant="default"
                    onClick={button.action}
                    disabled={button.disabled}
                    pressed={button.active || false}
                    className="disabled:opacity-30"
                  >
                    {button.icon}
                  </Toggle>
                </Tooltip>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除表格确认对话框 */}
      <AlertDialog
        open={showDeleteAlert}
        onClose={() => setShowDeleteAlert(false)}
        onConfirm={handleDeleteTable}
        title="删除表格"
        description="确定要删除此表格吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
      />
    </>
  );
}
