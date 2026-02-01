"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { RiSendPlane2Line } from "@remixicon/react";

import { AutoResizer } from "@/ui/AutoResizer";
import { Button } from "@/ui/Button";

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void> | void;
  onTyping?: () => void;
  onStopTyping?: () => void;
}

export default function MessageInput({
  onSendMessage,
  onTyping,
  onStopTyping,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // 处理发送
  const handleSend = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending) return;

    // 停止输入信号
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    onStopTyping?.();

    setIsSending(true);
    try {
      await onSendMessage(trimmedContent);
      setContent(""); // 清空输入框
      // 保持焦点在输入框（在下一个事件循环中执行，确保 DOM 更新完成）
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } finally {
      setIsSending(false);
    }
  };

  // 处理输入变化
  const handleContentChange = (value: string) => {
    setContent(value);

    // 触发正在输入信号
    if (value.trim()) {
      onTyping?.();

      // 设置定时器，5秒后没有输入则停止发送信号
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
      typingTimerRef.current = setTimeout(() => {
        onStopTyping?.();
      }, 5000);
    } else {
      // 如果输入为空，立即停止信号
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      onStopTyping?.();
    }
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送（不按 Ctrl 或 Shift）
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Ctrl+Enter 或 Shift+Enter 换行（默认行为，不需要处理）
  };

  return (
    <AutoResizer>
      <div className="flex items-end">
        {/* 输入框 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={"输入消息..."}
            className="w-full max-h-[200px] px-4 pt-4 text-sm
                       resize-none outline-none
                       placeholder:text-muted-foreground"
            rows={3}
            disabled={isSending}
          />
        </div>
        {/* 发送按钮 */}
      </div>
      <div className="flex justify-end w-full px-4 pb-4">
        <Button
          label="发送"
          variant="primary"
          size="sm"
          icon={<RiSendPlane2Line size="1.2em" />}
          iconPosition="left"
          onClick={handleSend}
          disabled={!content.trim() || isSending}
          loading={isSending}
          aria-label="发送消息"
        />
      </div>
    </AutoResizer>
  );
}
