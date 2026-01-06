"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { Message } from "@repo/shared-types/api/message";
import MessageItem from "./MessageItem";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { AutoTransition } from "@/ui/AutoTransition";

interface MessageListProps {
  messages: Message[];
  currentUserId: number;
  conversationId: string;
  onScrollChange: (isAtBottom: boolean) => void;
  onRetryMessage: (tempId: string, content: string) => void;
  onLoadMoreMessages?: (skip: number) => Promise<boolean>; // 返回是否还有更多消息
}

export interface MessageListRef {
  scrollToBottom: (smooth?: boolean) => void;
}

const MessageList = forwardRef<MessageListRef, MessageListProps>(
  (
    {
      messages,
      currentUserId,
      conversationId,
      onScrollChange,
      onRetryMessage,
      onLoadMoreMessages,
    },
    ref,
  ) => {
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const lastScrollHeightRef = useRef(0);
    const prevMessagesLengthRef = useRef(0);

    // 暴露给父组件的方法
    useImperativeHandle(ref, () => ({
      scrollToBottom,
    }));

    // 滚动到底部
    const scrollToBottom = useCallback((smooth = false) => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: smooth ? "smooth" : "auto",
        });
      }
    }, []);

    // 检查是否在底部
    const checkIfAtBottom = useCallback(() => {
      if (!scrollContainerRef.current) return false;

      const { scrollTop, scrollHeight, clientHeight } =
        scrollContainerRef.current;
      const threshold = 100; // 100px 以内认为在底部
      return scrollHeight - scrollTop - clientHeight < threshold;
    }, []);

    // 处理滚动事件
    const handleScroll = useCallback(() => {
      if (!scrollContainerRef.current) return;

      const { scrollTop } = scrollContainerRef.current;
      const atBottom = checkIfAtBottom();

      // 通知父组件滚动位置变化
      onScrollChange(atBottom);

      // 如果滚动到顶部，加载更多
      if (scrollTop < 100 && hasMore && !loadingRef.current) {
        loadMore();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasMore, onScrollChange, checkIfAtBottom]);

    // 加载更多消息
    const loadMore = async () => {
      if (
        loadingRef.current ||
        !hasMore ||
        !conversationId ||
        !onLoadMoreMessages
      )
        return;

      loadingRef.current = true;
      setIsLoadingMore(true);

      // 记录当前滚动高度
      if (scrollContainerRef.current) {
        lastScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
      }

      try {
        const stillHasMore = await onLoadMoreMessages(messages.length);
        setHasMore(stillHasMore);

        // 恢复滚动位置
        setTimeout(() => {
          if (scrollContainerRef.current) {
            const newScrollHeight = scrollContainerRef.current.scrollHeight;
            const scrollDiff = newScrollHeight - lastScrollHeightRef.current;
            scrollContainerRef.current.scrollTop = scrollDiff;
          }
        }, 0);
      } catch (error) {
        console.error("加载更多失败:", error);
      } finally {
        setIsLoadingMore(false);
        loadingRef.current = false;
      }
    };

    // 当新消息到来时，如果在底部则自动滚动
    useEffect(() => {
      if (messages.length > 0 && checkIfAtBottom()) {
        scrollToBottom();
      }
    }, [messages.length, checkIfAtBottom, scrollToBottom]);

    // 初次加载完成后滚动到底部
    useEffect(() => {
      if (messages.length > 0 && prevMessagesLengthRef.current === 0) {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
      prevMessagesLengthRef.current = messages.length;
    }, [messages.length, scrollToBottom]);

    return (
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-6 py-4"
      >
        <div className="absolute top-0 w-full z-5 bg-gradient-to-b from-background to-transparent h-6"></div>
        {/* 加载更多指示器 */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <LoadingIndicator size="sm" />
          </div>
        )}

        {/* 没有更多提示 */}
        {!hasMore && messages.length > 0 && (
          <div className="flex items-center justify-center py-4">
            <p className="text-xs text-muted-foreground">没有更多消息了</p>
          </div>
        )}

        {/* 消息列表 */}
        <AutoTransition type="fade" duration={0.2}>
          <div key="messages" className="flex flex-col gap-3">
            {messages.map((message) => (
              <MessageItem
                key={message.tempId || message.id}
                message={message}
                isOwn={message.senderUid === currentUserId}
                onRetry={onRetryMessage}
              />
            ))}
          </div>
        </AutoTransition>

        {/* 空状态 */}
        {messages.length === 0 && !isLoadingMore && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              还没有消息，开始聊天吧
            </p>
          </div>
        )}
        <div className="absolute bottom-0 w-full z-5 bg-gradient-to-t from-background to-transparent h-6"></div>
      </div>
    );
  },
);

MessageList.displayName = "MessageList";

export default MessageList;
