"use client";

import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiCodeSSlashLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiEdit2Line,
} from "@remixicon/react";
import { Toggle } from "@/ui/Toggle";
import { Tooltip } from "@/ui/Tooltip";
import { useToast } from "@/ui/Toast";
import { useState } from "react";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";

interface CodeBlockToolbarProps {
  editor: Editor;
  isVisible: boolean;
  currentLanguage: string;
}

export function CodeBlockToolbar({
  editor,
  isVisible,
  currentLanguage,
}: CodeBlockToolbarProps) {
  const toast = useToast();
  const [isLanguageDialogOpen, setIsLanguageDialogOpen] = useState(false);
  const [languageInput, setLanguageInput] = useState("");

  const handleOpenLanguageDialog = () => {
    setLanguageInput(currentLanguage || "");
    setIsLanguageDialogOpen(true);
  };

  const handleSaveLanguage = () => {
    editor
      .chain()
      .focus()
      .updateAttributes("codeBlock", { language: languageInput.trim() })
      .run();
    setIsLanguageDialogOpen(false);
    toast.success(
      "已更新",
      `代码语言已设置为: ${languageInput.trim() || "纯文本"}`,
    );
  };

  const handleCopyCode = () => {
    // 获取代码块内容
    const { state } = editor;
    const { $from } = state.selection;

    // 向上查找代码块节点
    let codeBlockNode = null;
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      if (node.type.name === "codeBlock") {
        codeBlockNode = node;
        break;
      }
    }

    if (codeBlockNode) {
      const code = codeBlockNode.textContent;
      navigator.clipboard
        .writeText(code)
        .then(() => {
          toast.success("已复制", "代码已复制到剪贴板");
        })
        .catch(() => {
          toast.error("复制失败", "无法复制代码到剪贴板");
        });
    }
  };

  const handleDeleteCodeBlock = () => {
    editor.chain().focus().deleteNode("codeBlock").run();
  };

  const codeBlockButtons = [
    {
      icon: <RiEdit2Line size="1.2em" />,
      action: handleOpenLanguageDialog,
      name: "修改语言",
      disabled: false,
    },
    {
      icon: <RiFileCopyLine size="1.2em" />,
      action: handleCopyCode,
      name: "复制代码",
      disabled: false,
    },
    {
      icon: <RiDeleteBinLine size="1.2em" className="text-error" />,
      action: handleDeleteCodeBlock,
      name: "删除代码块",
      disabled: false,
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
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2 px-2">
                <RiCodeSSlashLine size="1.2em" className="text-foreground/70" />
                <span className="text-sm text-foreground/70 font-mono">
                  {currentLanguage || "纯文本"}
                </span>
              </div>
              <div className="w-px h-6 bg-foreground/20" />
              {codeBlockButtons.map((button, index) => (
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

      {/* 语言设置对话框 */}
      <Dialog
        open={isLanguageDialogOpen}
        onClose={() => setIsLanguageDialogOpen(false)}
        title="设置代码语言"
        size="sm"
      >
        <div className="px-6 py-6 space-y-4">
          <div>
            <Input
              label="语言标识符"
              value={languageInput}
              size="sm"
              onChange={(e) => setLanguageInput(e.target.value)}
              placeholder="例如: javascript, python, rust..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSaveLanguage();
                }
              }}
              autoFocus
            />
            <p className="text-xs text-foreground/60 mt-2">
              填写语言全程/简称，如: javascript(js), typescript(ts), python(py),
              rust, go, java, cpp, html, css 等，兼容 Markdown 语法高亮标识符。
            </p>
            <p className="text-xs text-foreground/60 mt-1">留空以禁用高亮</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              label="取消"
              variant="secondary"
              size="sm"
              onClick={() => setIsLanguageDialogOpen(false)}
            />
            <Button label="确定" onClick={handleSaveLanguage} size="sm" />
          </div>
        </div>
      </Dialog>
    </>
  );
}
