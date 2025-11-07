"use client";

import { useState, useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Checkbox } from "@/ui/Checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiArrowUpSLine,
  RiArrowDownSLine,
  RiCloseLine,
  RiSearchLine,
  RiFileEditLine,
} from "@remixicon/react";
import { Tooltip } from "@/ui/Tooltip";
import { Toggle } from "@/ui/Toggle";
import { Popover, PopoverTrigger, PopoverContent } from "@/ui/Popover";

export type Mode = "find" | "replace";

export interface FindReplaceDialogProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  triggerElement?: React.ReactNode;
}

export interface MatchInfo {
  from: number;
  to: number;
}

export function FindReplaceDialog({
  editor,
  isOpen,
  onClose,
  triggerElement,
}: FindReplaceDialogProps) {
  const [mode, setMode] = useState<Mode>("find");
  const [searchText, setSearchText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 查找所有匹配项
  const findAllMatches = useCallback(() => {
    if (!editor || !searchText) {
      setMatches([]);
      setCurrentIndex(-1);
      return;
    }

    const { state } = editor;
    const { doc } = state;
    const foundMatches: MatchInfo[] = [];

    doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text || "";
        const searchLower = caseSensitive
          ? searchText
          : searchText.toLowerCase();
        const textToSearch = caseSensitive ? text : text.toLowerCase();

        let index = textToSearch.indexOf(searchLower);
        while (index !== -1) {
          foundMatches.push({
            from: pos + index,
            to: pos + index + searchText.length,
          });
          index = textToSearch.indexOf(searchLower, index + 1);
        }
      }
    });

    setMatches(foundMatches);
    if (foundMatches.length > 0 && foundMatches[0]) {
      setCurrentIndex(0);
      // 跳转到第一个匹配项
      editor
        .chain()
        .focus()
        .setTextSelection({
          from: foundMatches[0].from,
          to: foundMatches[0].to,
        })
        .run();
    } else {
      setCurrentIndex(-1);
    }
  }, [editor, searchText, caseSensitive]);

  // 跳转到指定索引的匹配项
  const goToMatch = useCallback(
    (index: number) => {
      if (!editor || matches.length === 0) return;

      const match = matches[index];
      if (!match) return;

      editor
        .chain()
        .focus()
        .setTextSelection({
          from: match.from,
          to: match.to,
        })
        .run();

      setCurrentIndex(index);
    },
    [editor, matches],
  );

  // 查找下一个
  const handleFindNext = useCallback(() => {
    if (matches.length === 0) return;
    const nextIndex = (currentIndex + 1) % matches.length;
    goToMatch(nextIndex);
  }, [matches.length, currentIndex, goToMatch]);

  // 查找上一个
  const handleFindPrevious = useCallback(() => {
    if (matches.length === 0) return;
    const prevIndex = (currentIndex - 1 + matches.length) % matches.length;
    goToMatch(prevIndex);
  }, [matches.length, currentIndex, goToMatch]);

  // 替换当前选中项
  const handleReplaceOne = useCallback(() => {
    if (!editor || matches.length === 0 || currentIndex === -1) return;

    const match = matches[currentIndex];
    if (!match) return;

    editor
      .chain()
      .focus()
      .setTextSelection({ from: match.from, to: match.to })
      .insertContent(replaceText)
      .run();

    // 重新查找（因为位置可能改变）
    setTimeout(() => {
      findAllMatches();
    }, 50);
  }, [editor, matches, currentIndex, replaceText, findAllMatches]);

  // 全部替换
  const handleReplaceAll = useCallback(() => {
    if (!editor || !searchText) return;

    const { state } = editor;
    const { doc } = state;
    const tr = state.tr;

    const replacements: { from: number; to: number }[] = [];

    doc.descendants((node, pos) => {
      if (node.isText) {
        const text = node.text || "";
        const searchLower = caseSensitive
          ? searchText
          : searchText.toLowerCase();
        const textToSearch = caseSensitive ? text : text.toLowerCase();

        let index = textToSearch.indexOf(searchLower);

        while (index !== -1) {
          replacements.push({
            from: pos + index,
            to: pos + index + searchText.length,
          });
          index = textToSearch.indexOf(searchLower, index + searchText.length);
        }
      }
    });

    // 从后往前替换，避免位置偏移问题
    for (let i = replacements.length - 1; i >= 0; i--) {
      const replacement = replacements[i];
      if (replacement) {
        const { from, to } = replacement;
        tr.insertText(replaceText, from, to);
      }
    }

    editor.view.dispatch(tr);

    // 清空匹配和关闭工具栏
    setMatches([]);
    setCurrentIndex(-1);
    setShowToolbar(false);
  }, [editor, searchText, replaceText, caseSensitive]);

  // 关闭工具栏
  const handleCloseToolbar = useCallback(() => {
    setShowToolbar(false);
    // 清除选中
    if (editor) {
      editor.chain().focus().setTextSelection(editor.state.selection.to).run();
    }
  }, [editor]);

  // 开始查找
  const handleStartFind = () => {
    if (!searchText) return;
    findAllMatches();
    onClose(); // 关闭 Popover
    setShowToolbar(true); // 显示工具栏
  };

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setMode("find");
      // 不清空搜索文本，方便用户再次打开时继续使用
    }
  }, [isOpen]);

  // 关闭工具栏时清理状态
  useEffect(() => {
    if (!showToolbar) {
      setMatches([]);
      setCurrentIndex(-1);
    }
  }, [showToolbar]);

  // 工具栏键盘快捷键支持
  useEffect(() => {
    if (!showToolbar) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc 关闭工具栏
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseToolbar();
      }
      // Enter 下一个
      else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleFindNext();
      }
      // Shift+Enter 上一个
      else if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        handleFindPrevious();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showToolbar, handleFindNext, handleFindPrevious, handleCloseToolbar]);

  return (
    <>
      <Popover
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <PopoverTrigger asChild>
          <div className="inline-flex">
            <Tooltip content="查找和替换 (Ctrl+F)">
              {triggerElement || (
                <Toggle size="sm" variant="default">
                  <RiSearchLine size="1.2em" />
                </Toggle>
              )}
            </Tooltip>
          </div>
        </PopoverTrigger>

        <PopoverContent className="w-[420px] p-0">
          <div className="p-4 space-y-4">
            {/* 模式切换 */}
            <div className="flex gap-2 pb-3 border-b border-foreground/10">
              <Button
                onClick={() => setMode("find")}
                variant={mode === "find" ? "primary" : "ghost"}
                size="sm"
                label="查找"
                icon={<RiSearchLine size="1.1em" />}
              >
                查找
              </Button>
              <Button
                onClick={() => setMode("replace")}
                variant={mode === "replace" ? "primary" : "ghost"}
                size="sm"
                label="替换"
                icon={<RiFileEditLine size="1.1em" />}
              >
                替换
              </Button>
            </div>

            {/* 输入区域 */}
            <div className="space-y-3">
              <Input
                label="查找内容"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="输入要查找的文本"
                size="sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleStartFind();
                  }
                }}
                autoFocus
              />

              {mode === "replace" && (
                <Input
                  label="替换为"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="输入替换文本"
                  size="sm"
                />
              )}
            </div>

            {/* 选项 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-foreground">选项</h3>
              <Checkbox
                label="区分大小写"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-3 border-t border-foreground/10">
              {mode === "find" ? (
                <Button
                  onClick={handleStartFind}
                  variant="primary"
                  size="sm"
                  label="查找"
                  disabled={!searchText}
                >
                  查找
                </Button>
              ) : (
                <>
                  <Button
                    onClick={handleStartFind}
                    variant="outline"
                    size="sm"
                    label="查找"
                    disabled={!searchText}
                  >
                    查找
                  </Button>
                  <Button
                    onClick={() => {
                      handleReplaceAll();
                      onClose();
                    }}
                    variant="primary"
                    size="sm"
                    label="全部替换"
                    disabled={!searchText}
                  >
                    全部替换
                  </Button>
                </>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 浮动工具栏 */}
      <AnimatePresence>
        {showToolbar && matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[calc(5em+2rem)] left-1/2 -translate-x-1/2 z-50 bg-background/95 backdrop-blur-sm border border-foreground/10 rounded-lg shadow-lg px-3 py-2"
          >
            <div className="flex gap-1 items-center">
              <span className="text-sm text-muted-foreground mr-2 px-2">
                {currentIndex + 1} / {matches.length}
              </span>

              <Tooltip content="上一个 (Shift+Enter)">
                <Toggle
                  size="sm"
                  variant="default"
                  onClick={handleFindPrevious}
                  disabled={matches.length === 0}
                  className="disabled:opacity-30"
                >
                  <RiArrowUpSLine size="1.2em" />
                </Toggle>
              </Tooltip>

              <Tooltip content="下一个 (Enter)">
                <Toggle
                  size="sm"
                  variant="default"
                  onClick={handleFindNext}
                  disabled={matches.length === 0}
                  className="disabled:opacity-30"
                >
                  <RiArrowDownSLine size="1.2em" />
                </Toggle>
              </Tooltip>

              {mode === "replace" && (
                <>
                  <div className="w-px h-6 bg-foreground/10 mx-1" />
                  <Tooltip content="替换当前">
                    <Toggle
                      size="sm"
                      variant="default"
                      onClick={handleReplaceOne}
                      disabled={matches.length === 0}
                      className="disabled:opacity-30"
                    >
                      <RiFileEditLine size="1.2em" />
                    </Toggle>
                  </Tooltip>
                </>
              )}

              <div className="w-px h-6 bg-foreground/10 mx-1" />

              <Tooltip content="关闭 (Esc)">
                <Toggle
                  size="sm"
                  variant="default"
                  onClick={handleCloseToolbar}
                >
                  <RiCloseLine size="1.2em" />
                </Toggle>
              </Tooltip>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
