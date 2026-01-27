/* eslint-disable @next/next/no-img-element */
"use client";

import type { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import { RiEdit2Line, RiDeleteBinLine } from "@remixicon/react";
import { Toggle } from "@/ui/Toggle";
import { Tooltip } from "@/ui/Tooltip";
import { useState } from "react";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";

interface ImageToolbarProps {
  editor: Editor;
  isVisible: boolean;
  imageSrc: string;
  imageAlt: string;
  onEditAlt: (alt: string) => void;
}

export function ImageToolbar({
  editor,
  isVisible,
  imageSrc,
  imageAlt,
  onEditAlt,
}: ImageToolbarProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [altText, setAltText] = useState(imageAlt);

  // 当 imageAlt 变化时更新本地状态
  if (altText !== imageAlt && !isEditDialogOpen) {
    setAltText(imageAlt);
  }

  const handleEditClick = () => {
    setAltText(imageAlt);
    setIsEditDialogOpen(true);
  };

  const handleSaveAlt = () => {
    onEditAlt(altText);
    setIsEditDialogOpen(false);
  };

  const handleDeleteImage = () => {
    editor.chain().focus().deleteSelection().run();
  };

  const imageButtons = [
    {
      icon: <RiEdit2Line size="1.2em" />,
      action: handleEditClick,
      name: "编辑 Alt 文本",
      disabled: false,
    },
    {
      icon: <RiDeleteBinLine size="1.2em" className="text-error" />,
      action: handleDeleteImage,
      name: "删除图片",
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
            <div className="flex gap-1 items-center">
              <div className="text-sm text-foreground/70 px-2 max-w-xs truncate">
                {imageAlt || "（无 Alt 文本）"}
              </div>
              <div className="w-px h-6 bg-foreground/20" />
              {imageButtons.map((button, index) => (
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

      {/* 编辑 Alt 文本对话框 */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        title="编辑图片 Alt 文本"
        size="md"
      >
        <div className="px-6 py-6 space-y-6">
          <div className="space-y-2">
            <div className="bg-muted/20 p-4 rounded-lg">
              <img
                src={imageSrc}
                alt={imageAlt}
                className="w-full max-h-[20em] rounded-md object-cover"
              />
              <p className="text-xs text-foreground/60 break-all">{imageSrc}</p>
            </div>

            <Input
              label="Alt 文本"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="请输入图片的替代文本"
              size="sm"
              helperText="Alt 文本用于描述图片内容，对于 SEO 和无障碍访问很重要"
            />
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-foreground/10">
            <Button
              label="取消"
              variant="ghost"
              onClick={() => setIsEditDialogOpen(false)}
              size="sm"
            />
            <Button
              label="保存"
              variant="primary"
              onClick={handleSaveAlt}
              size="sm"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
