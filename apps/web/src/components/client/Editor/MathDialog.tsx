"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog } from "@/ui/Dialog";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { SegmentedControl } from "@/ui/SegmentedControl";
import katex from "katex";
import type { Editor } from "@tiptap/react";
import { AutoTransition } from "@/ui/AutoTransition";
import { AutoResizer } from "@/ui/AutoResizer";

interface MathDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editor: Editor | null;
  initialLatex?: string;
  initialType?: "inline" | "block";
  position?: number;
  mode?: "insert" | "edit";
}

/**
 * 数学公式编辑对话框
 * 支持实时预览、插入和编辑数学公式
 */
export function MathDialog({
  isOpen,
  onClose,
  editor,
  initialLatex = "",
  initialType = "inline",
  position,
  mode = "insert",
}: MathDialogProps) {
  const [latex, setLatex] = useState(initialLatex);
  const [mathType, setMathType] = useState<"inline" | "block">(initialType);
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // 更新预览
  useEffect(() => {
    if (!latex.trim()) {
      setPreviewHtml("");
      setError("");
      return;
    }

    try {
      const html = katex.renderToString(latex, {
        throwOnError: false,
        displayMode: mathType === "block",
        errorColor: "#ef4444",
      });
      setPreviewHtml(html);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "渲染错误");
      setPreviewHtml("");
    }
  }, [latex, mathType]);

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setLatex(initialLatex);
      setMathType(initialType);
    }
  }, [isOpen, initialLatex, initialType]);

  const handleInsert = () => {
    if (!editor || !latex.trim()) return;

    if (mode === "edit" && position !== undefined) {
      // 编辑模式：更新现有公式
      if (mathType === "inline") {
        editor
          .chain()
          .setNodeSelection(position)
          .updateInlineMath({ latex })
          .focus()
          .run();
      } else {
        editor
          .chain()
          .setNodeSelection(position)
          .updateBlockMath({ latex })
          .focus()
          .run();
      }
    } else {
      // 插入模式：插入新公式
      if (mathType === "inline") {
        editor.chain().focus().insertInlineMath({ latex }).run();
      } else {
        editor.chain().focus().insertBlockMath({ latex }).run();
      }
    }

    handleClose();
  };

  const handleDelete = () => {
    if (!editor || mode !== "edit" || position === undefined) return;

    if (mathType === "inline") {
      editor
        .chain()
        .setNodeSelection(position)
        .deleteInlineMath()
        .focus()
        .run();
    } else {
      editor.chain().setNodeSelection(position).deleteBlockMath().focus().run();
    }

    handleClose();
  };

  const handleClose = () => {
    setLatex("");
    setError("");
    setPreviewHtml("");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleInsert();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title={mode === "edit" ? "编辑数学公式" : "插入数学公式"}
      size="lg"
    >
      <div className="px-6 py-6 space-y-6">
        {/* 类型选择 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            公式类型
          </label>
          <SegmentedControl
            value={mathType}
            onChange={(value) => setMathType(value as "inline" | "block")}
            options={[
              {
                value: "inline",
                label: "行内公式",
                description: "$...$",
              },
              {
                value: "block",
                label: "块级公式",
                description: "$$...$$",
              },
            ]}
            columns={2}
          />
        </div>

        {/* 预览区域 */}
        <AutoResizer>
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">
              预览
            </label>
            <div
              className={`min-h-[120px] p-4 rounded-lg border border-border bg-background flex items-center justify-center ${
                mathType === "block" ? "overflow-x-auto" : ""
              }`}
            >
              {previewHtml ? (
                <div
                  className={mathType === "block" ? "text-center w-full" : ""}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <div className="text-muted-foreground text-sm">
                  {error || "在下方输入 LaTeX 公式以预览"}
                </div>
              )}
            </div>
          </div>

          {/* 输入区域 */}
          <AutoTransition>
            <Input
              ref={inputRef}
              key={mathType}
              label="LaTeX 代码"
              type={mathType === "block" ? "textarea" : "text"}
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              helperText="例如: E = mc^2 或 \frac{a}{b}"
              className="font-mono"
              size="sm"
              rows={mathType === "block" ? 6 : undefined}
            />
          </AutoTransition>
        </AutoResizer>

        {/* 操作按钮 */}
        <div className="flex justify-between pt-4 border-t border-foreground/10">
          <div>
            {mode === "edit" && (
              <Button
                label="删除公式"
                onClick={handleDelete}
                variant="danger"
                size="sm"
              />
            )}
          </div>
          <div className="flex gap-4">
            <Button
              label="取消"
              onClick={handleClose}
              variant="ghost"
              size="sm"
            />
            <Button
              label={mode === "edit" ? "更新" : "插入"}
              onClick={handleInsert}
              disabled={!latex.trim()}
              variant="primary"
              size="sm"
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}
