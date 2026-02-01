"use client";

import type { Conversation } from "@repo/shared-types/api/message";

import UserAvatar from "@/components/UserAvatar";
import { AutoTransition } from "@/ui/AutoTransition";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  currentUserId: number;
  onSelect: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

// 格式化时间
const formatTime = (date: string) => {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);

  // 1分钟内显示"刚刚"
  if (minutes < 1) {
    return "刚刚";
  }

  // 超过1分钟，显示准确时间
  const messageDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // 今天
  if (messageDate >= today) {
    return messageDate.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // 昨天
  if (messageDate >= yesterday) {
    return `昨天 ${messageDate.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // 今年
  if (messageDate.getFullYear() === today.getFullYear()) {
    return messageDate.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // 更早
  return messageDate.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export default function ConversationItem({
  conversation,
  isSelected,
  currentUserId,
  onSelect,
}: ConversationItemProps) {
  const { otherUser, lastMessage, unreadCount } = conversation;

  // 判断最后一条消息是谁发的
  const isLastMessageFromMe =
    lastMessage && lastMessage.senderUid === currentUserId;

  return (
    <AutoTransition>
      <div
        onClick={() => onSelect(conversation.conversationId)}
        className={`px-6 py-4 border-b border-foreground/10 cursor-pointer transition-all duration-200 hover:bg-foreground/5 ${
          isSelected ? "bg-primary/5" : ""
        }`}
      >
        <div className="flex gap-3">
          {/* 头像 */}
          <div className="flex-shrink-0 relative">
            <UserAvatar
              username={otherUser.nickname || otherUser.username}
              avatarUrl={otherUser.avatar}
              emailMd5={otherUser.emailMd5}
              shape="circle"
              className="!block w-12 h-full"
            />
            {/* 在线状态指示器 */}
            {otherUser.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
            )}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 第一行：昵称 + 时间 */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {otherUser.nickname || otherUser.username}
              </h3>
              {lastMessage && (
                <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                  {formatTime(lastMessage.createdAt)}
                </span>
              )}
            </div>

            {/* 第二行：最新消息预览 + 未读数 */}
            <div className="flex items-center justify-between">
              <p
                className={`text-sm truncate ${
                  unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {lastMessage ? (
                  <>
                    {isLastMessageFromMe && <span className="mr-1">我:</span>}
                    {lastMessage.content}
                  </>
                ) : (
                  <span className="italic">暂无消息</span>
                )}
              </p>

              {/* 未读数徽章 */}
              {unreadCount > 0 ? (
                <div className="flex-shrink-0">
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-mono font-medium bg-primary/10 text-primary rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                </div>
              ) : (
                <div className="flex-shrink-0">
                  <span className="ml-2 px-1.5 py-0.5 text-xs font-mono font-medium bg-primary/10 text-primary rounded-full opacity-0">
                    0
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AutoTransition>
  );
}
