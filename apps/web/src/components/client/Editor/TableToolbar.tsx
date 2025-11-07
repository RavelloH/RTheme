"use client";

import { Editor } from "@tiptap/react";
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
