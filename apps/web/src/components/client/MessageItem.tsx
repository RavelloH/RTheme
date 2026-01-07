"use client";

import type { Message } from "@repo/shared-types/api/message";
import {
  RiLoader4Line,
  RiCheckLine,
  RiCheckDoubleLine,
  RiErrorWarningLine,
  RiRefreshLine,
} from "@remixicon/react";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  onRetry: (tempId: string, content: string) => void;
}

// 格式化时间（只显示时分）
const formatTime = (date: Date) => {
  return new Date(date).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function MessageItem({
  message,
  isOwn,
  onRetry,
}: MessageItemProps) {
  const { content, createdAt, status } = message;

  // 渲染状态图标
  const renderStatusIcon = () => {
    if (!isOwn || !status) return null;

    switch (status) {
      case "sending":
        return (
          <RiLoader4Line
            size="0.875em"
            key="sending"
            className="text-muted-foreground animate-spin"
          />
        );
      case "sent":
        return (
          <RiCheckLine
            size="0.875em"
            className="text-muted-foreground"
            key="sent"
          />
        );
      case "read":
        return (
          <RiCheckDoubleLine
            size="0.875em"
            className="text-primary"
            key="read"
          />
        );
      case "failed":
        return (
          <RiErrorWarningLine
            size="0.875em"
            className="text-error"
            key="error"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}
      >
        {/* 消息气泡 */}
        <div
          className={`px-4 py-2 rounded-sm break-words ${
            isOwn
              ? "bg-primary text-primary-foreground"
              : "bg-foreground/10 text-foreground"
          } ${status === "failed" ? "opacity-60" : ""}`}
        >
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        </div>

        {/* 底部信息：时间 + 状态 + 重试按钮 */}
        <div className="flex items-center gap-1.5 px-1">
          <span className="text-xs text-muted-foreground">
            {formatTime(createdAt)}
          </span>

          {/* 状态图标 */}
          <AutoTransition type="scale">{renderStatusIcon()}</AutoTransition>

          {/* 失败时显示重试按钮 */}
          {status === "failed" && message.tempId && (
            <Clickable
              onClick={() => onRetry(message.tempId!, content)}
              aria-label="重试发送"
            >
              <RiRefreshLine size="0.8em" />
            </Clickable>
          )}
        </div>
      </div>
    </div>
  );
}
