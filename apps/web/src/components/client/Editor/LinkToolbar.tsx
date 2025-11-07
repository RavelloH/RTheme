"use client";

import { Editor } from "@tiptap/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RiExternalLinkLine,
  RiEdit2Line,
  RiDeleteBinLine,
} from "@remixicon/react";
import { Toggle } from "@/ui/Toggle";
import { Tooltip } from "@/ui/Tooltip";

interface LinkToolbarProps {
  editor: Editor;
  isVisible: boolean;
  linkUrl: string;
  onEdit: () => void;
}

export function LinkToolbar({
  editor,
  isVisible,
  linkUrl,
  onEdit,
}: LinkToolbarProps) {
  const handleVisitLink = () => {
    if (linkUrl) {
      window.open(linkUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleDeleteLink = () => {
    editor.chain().focus().unsetLink().run();
  };

  const linkButtons = [
    {
      icon: <RiExternalLinkLine size="1.2em" />,
      action: handleVisitLink,
      name: "打开链接",
      disabled: !linkUrl,
    },
    {
      icon: <RiEdit2Line size="1.2em" />,
      action: onEdit,
      name: "修改链接",
      disabled: false,
    },
    {
      icon: <RiDeleteBinLine size="1.2em" className="text-error" />,
      action: handleDeleteLink,
      name: "删除链接",
      disabled: !editor.can().unsetLink(),
    },
  ];

  return (
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
              {linkUrl}
            </div>
            <div className="w-px h-6 bg-foreground/20" />
            {linkButtons.map((button, index) => (
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
  );
}
