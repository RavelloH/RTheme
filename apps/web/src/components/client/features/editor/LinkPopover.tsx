"use client";

import { useEffect, useState } from "react";
import { RiLink, RiText } from "@remixicon/react";

import { Button } from "@/ui/Button";
import { Input } from "@/ui/Input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover";
import { Toggle } from "@/ui/Toggle";

interface LinkPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (text: string, url: string) => void;
  initialText?: string;
  initialUrl?: string;
  isActive?: boolean;
}

export function LinkPopover({
  open,
  onOpenChange,
  onSubmit,
  initialText = "",
  initialUrl = "",
  isActive = false,
}: LinkPopoverProps) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);

  // 当 popover 打开时更新初始值
  useEffect(() => {
    if (open) {
      setText(initialText);
      setUrl(initialUrl);
    }
  }, [open, initialText, initialUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    // 支持完整URL、绝对路径、锚点等多种格式
    if (
      trimmedUrl &&
      (trimmedUrl.startsWith("http://") ||
        trimmedUrl.startsWith("https://") ||
        trimmedUrl.startsWith("/") ||
        trimmedUrl.startsWith("#") ||
        trimmedUrl.startsWith("mailto:") ||
        trimmedUrl.startsWith("tel:"))
    ) {
      onSubmit(text.trim(), trimmedUrl);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    // 重置表单
    setText(initialText);
    setUrl(initialUrl);
  };

  return (
    <Popover
      open={open}
      onOpenChange={onOpenChange}
      side="bottom"
      align="start"
      sideOffset={8}
    >
      <PopoverTrigger asChild>
        <Toggle size="sm" variant="default" pressed={isActive}>
          <RiLink size="1.2em" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-96 py-4 px-6 bg-muted/30 backdrop-blur-sm border border-foreground/10 rounded-sm shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              label="链接文字（可选）"
              icon={<RiText size="1em" />}
              size="sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
              helperText="请输入链接文字（可选）"
              autoFocus
            />
          </div>
          <div>
            <Input
              label="链接地址"
              icon={<RiLink size="1em" />}
              size="sm"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              helperText="支持完整URL、绝对路径(/xxx)、锚点(#xxx)等"
              required
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              label="取消"
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCancel}
            />
            <Button label="确定" type="submit" variant="primary" size="sm" />
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
