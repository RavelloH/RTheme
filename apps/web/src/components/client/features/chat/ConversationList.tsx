"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { RiAddLine, RiChatNewLine, RiMailLine } from "@remixicon/react";
import type { Conversation } from "@repo/shared-types/api/message";
import { useRouter } from "next/navigation";

import ConversationItem from "@/components/client/features/chat/ConversationItem";
import NewConversationDialog from "@/components/client/features/chat/NewConversationDialog";
import { AutoTransition } from "@/ui/AutoTransition";
import Clickable from "@/ui/Clickable";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  currentUserId: number;
  hasMore: boolean;
  total: number;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  onLoadMore: (skip: number) => Promise<void>;
  isModal?: boolean; // 是否在模态框中
  onNewConversation?: (uid: number) => void; // 新会话回调
}

export default function ConversationList({
  conversations,
  selectedConversationId,
  currentUserId,
  hasMore,
  total: _total,
  onSelectConversation,
  onDeleteConversation,
  onLoadMore,
  isModal = false,
  onNewConversation,
}: ConversationListProps) {
  const router = useRouter();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showNewConversationDialog, setShowNewConversationDialog] =
    useState(false);
  const loadingRef = useRef(false);

  // 使用 react-intersection-observer 监听触发元素（倒数第 5 个）
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    skip: !hasMore,
  });

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      await onLoadMore(conversations.length);
    } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  }, [conversations.length, onLoadMore]);

  // 当触发元素进入视口时加载更多
  useEffect(() => {
    if (inView && hasMore && !loadingRef.current && !isLoadingMore) {
      const timer = setTimeout(() => {
        if (hasMore && !loadingRef.current) {
          loadMore();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [inView, hasMore, isLoadingMore, loadMore]);

  // 处理选择用户发起新会话
  const handleSelectUser = useCallback(
    (uid: number) => {
      setShowNewConversationDialog(false);

      if (onNewConversation) {
        // 如果提供了回调，使用回调处理
        onNewConversation(uid);
      } else {
        // 否则使用默认路由逻辑
        const newUrl = `/messages?uid=${uid}`;
        if (isModal) {
          window.history.replaceState(null, "", newUrl);
        } else {
          router.replace(newUrl);
        }
      }
    },
    [isModal, router, onNewConversation],
  );

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-foreground/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiMailLine size="1.5em" className="text-primary" />
            <AutoTransition>
              {(() => {
                const unreadCount = conversations.reduce(
                  (sum, conv) => sum + conv.unreadCount,
                  0,
                );
                if (isModal) {
                  return unreadCount > 0
                    ? `${unreadCount} 个未读消息`
                    : "无未读消息";
                } else {
                  return (
                    <h2 className="text-xl font-bold text-foreground">
                      私信
                      {unreadCount > 0 && (
                        <span className="font-medium">
                          {" "}
                          - {unreadCount} 个未读消息
                        </span>
                      )}
                    </h2>
                  );
                }
              })()}
            </AutoTransition>
          </div>

          <Clickable
            onClick={() => setShowNewConversationDialog(true)}
            aria-label="发起新会话"
          >
            <RiAddLine size="1.2em" />
          </Clickable>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        <AutoTransition type="fade" duration={0.3} className="h-full">
          {conversations.length === 0 ? (
            // 空状态
            <Clickable
              key="empty"
              className="flex flex-col items-center justify-center h-full text-muted-foreground"
              onClick={() => setShowNewConversationDialog(true)}
              hoverScale={0.95}
            >
              <RiChatNewLine size="3em" className="mb-4" />
              <p className="text-sm text-center">暂无会话</p>
              <p className="text-xs text-center mt-2">
                点击上方按钮或此处发起新会话
              </p>
            </Clickable>
          ) : (
            <div key="list">
              {conversations.map((conversation, index) => {
                // 计算是否应该附加哨兵ref：倒数第 5 个
                const shouldAttachRef =
                  hasMore && index === conversations.length - 5;

                return (
                  <div
                    key={conversation.conversationId}
                    ref={shouldAttachRef ? loadMoreRef : undefined}
                  >
                    <ConversationItem
                      conversation={conversation}
                      isSelected={
                        conversation.conversationId === selectedConversationId
                      }
                      currentUserId={currentUserId}
                      onSelect={onSelectConversation}
                      onDelete={onDeleteConversation}
                    />
                  </div>
                );
              })}

              {/* 加载指示器 */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-6">
                  <LoadingIndicator size="sm" />
                </div>
              )}

              {/* 没有更多提示 */}
              {!hasMore && conversations.length > 0 && (
                <div className="flex items-center justify-center py-6">
                  <p className="text-xs text-muted-foreground">
                    没有更多会话了
                  </p>
                </div>
              )}
            </div>
          )}
        </AutoTransition>
      </div>

      {/* 新建会话对话框 */}
      <NewConversationDialog
        open={showNewConversationDialog}
        onClose={() => setShowNewConversationDialog(false)}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}
