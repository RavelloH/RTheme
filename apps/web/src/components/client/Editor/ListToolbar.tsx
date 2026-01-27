"use client";

import type { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Toggle } from "@/ui/Toggle";
import { RiIndentDecrease, RiIndentIncrease } from "@remixicon/react";
import { Tooltip } from "@/ui/Tooltip";

interface ListToolbarProps {
  editor: Editor | null;
}

export function ListToolbar({ editor }: ListToolbarProps) {
  const [isInList, setIsInList] = useState(false);
  const [canIndent, setCanIndent] = useState(false);
  const [canOutdent, setCanOutdent] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateState = () => {
      const inBulletList = editor.isActive("bulletList");
      const inOrderedList = editor.isActive("orderedList");
      const inTaskList = editor.isActive("taskList");

      setIsInList(inBulletList || inOrderedList || inTaskList);

      // 检查是否可以缩进/减少缩进
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;

      // 检查是否在列表项中
      const listItem = $from.node($from.depth - 1);
      if (listItem && listItem.type.name === "listItem") {
        setCanIndent(true);
        // 检查缩进深度
        setCanOutdent($from.depth > 3); // depth > 3 表示有缩进
      } else {
        setCanIndent(false);
        setCanOutdent(false);
      }
    };

    updateState();
    editor.on("selectionUpdate", updateState);
    editor.on("transaction", updateState);

    return () => {
      editor.off("selectionUpdate", updateState);
      editor.off("transaction", updateState);
    };
  }, [editor]);

  const handleSinkListItem = () => {
    if (!editor) return;
    editor.chain().focus().sinkListItem("listItem").run();
  };

  const handleLiftListItem = () => {
    if (!editor) return;
    editor.chain().focus().liftListItem("listItem").run();
  };

  if (!isInList) return null;

  return (
    <AnimatePresence>
      {isInList && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border border-foreground/10 rounded-lg shadow-lg px-3 py-2"
        >
          <div className="flex gap-1 items-center">
            <Tooltip content="减少缩进">
              <Toggle
                size="sm"
                variant="default"
                onClick={handleLiftListItem}
                disabled={!canOutdent}
                className="disabled:opacity-30"
              >
                <RiIndentDecrease size="1.2em" />
              </Toggle>
            </Tooltip>

            <Tooltip content="增加缩进">
              <Toggle
                size="sm"
                variant="default"
                onClick={handleSinkListItem}
                disabled={!canIndent}
                className="disabled:opacity-30"
              >
                <RiIndentIncrease size="1.2em" />
              </Toggle>
            </Tooltip>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
