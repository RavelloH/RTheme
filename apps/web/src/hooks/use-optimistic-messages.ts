import { useState, useCallback } from "react";
import type { Message, MessageStatus } from "@repo/shared-types/api/message";

interface OptimisticMessage extends Message {
  status: MessageStatus;
  tempId?: string;
}

/**
 * 乐观更新消息管理 Hook
 * 用于在发送消息时立即显示消息（乐观更新）
 */
export function useOptimisticMessages(initialMessages: Message[] = []) {
  const [messages, setMessages] = useState<OptimisticMessage[]>(
    initialMessages.map((msg) => ({
      ...msg,
      status: "sent" as const,
    })),
  );

  /**
   * 添加乐观消息（发送中状态）
   */
  const addOptimisticMessage = useCallback(
    (content: string, senderUid: number): string => {
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const optimisticMessage: OptimisticMessage = {
        id: tempId,
        content,
        type: "TEXT",
        senderUid,
        createdAt: new Date(),
        status: "sending",
        tempId,
      };

      setMessages((prev) => [...prev, optimisticMessage]);
      return tempId;
    },
    [],
  );

  /**
   * 更新消息状态（发送成功后用真实 ID 替换临时 ID）
   */
  const updateMessageStatus = useCallback(
    (tempId: string, realMessage: Message, status: MessageStatus = "sent") => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.tempId === tempId
            ? {
                ...realMessage,
                status,
                tempId: undefined,
              }
            : msg,
        ),
      );
    },
    [],
  );

  /**
   * 标记消息发送失败
   */
  const markMessageFailed = useCallback((tempId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.tempId === tempId ? { ...msg, status: "failed" as const } : msg,
      ),
    );
  }, []);

  /**
   * 重试发送失败的消息
   */
  const retryMessage = useCallback((tempId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.tempId === tempId ? { ...msg, status: "sending" as const } : msg,
      ),
    );
  }, []);

  /**
   * 移除消息（用于取消发送）
   */
  const removeMessage = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.tempId !== tempId));
  }, []);

  /**
   * 批量添加消息（用于加载历史消息）
   */
  const addMessages = useCallback((newMessages: Message[]) => {
    setMessages((prev) => {
      // 过滤掉已存在的消息（根据 ID）
      const existingIds = new Set(prev.map((msg) => msg.id));
      const uniqueNewMessages = newMessages.filter(
        (msg) => !existingIds.has(msg.id),
      );

      return [
        ...uniqueNewMessages.map((msg) => ({
          ...msg,
          status: "sent" as const,
        })),
        ...prev,
      ];
    });
  }, []);

  /**
   * 更新已读状态（显示双勾）
   * 将 lastReadMessageId 及其之前的所有消息标记为已读
   */
  const updateReadStatus = useCallback((lastReadMessageId: string | null) => {
    if (!lastReadMessageId) return;

    setMessages((prev) => {
      // 找到 lastReadMessageId 对应的消息
      const lastReadMessage = prev.find((msg) => msg.id === lastReadMessageId);
      if (!lastReadMessage) return prev;

      // 获取该消息的创建时间
      const lastReadTime = new Date(lastReadMessage.createdAt).getTime();

      // 将该消息及其之前的所有消息标记为已读
      return prev.map((msg) => {
        const msgTime = new Date(msg.createdAt).getTime();
        // 如果消息时间 <= lastReadTime，且当前状态是 sent，则标记为 read
        if (msgTime <= lastReadTime && msg.status === "sent") {
          return { ...msg, status: "read" as const };
        }
        return msg;
      });
    });
  }, []);

  /**
   * 重置消息列表
   */
  const resetMessages = useCallback((newMessages: Message[] = []) => {
    setMessages(
      newMessages.map((msg) => ({
        ...msg,
        status: "sent" as const,
      })),
    );
  }, []);

  /**
   * 追加新消息到末尾（用于接收新消息）
   * @param newMessages 新消息列表
   * @param lastReadMessageId 对方最后已读消息ID（可选）
   */
  const appendMessages = useCallback(
    (newMessages: Message[], lastReadMessageId?: string | null) => {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((msg) => msg.id));
        const uniqueNewMessages = newMessages.filter(
          (msg) => !existingIds.has(msg.id),
        );

        // 如果提供了 lastReadMessageId，计算已读时间戳
        let lastReadTime: number | null = null;
        if (lastReadMessageId) {
          const lastReadMsg = [...prev, ...uniqueNewMessages].find(
            (msg) => msg.id === lastReadMessageId,
          );
          if (lastReadMsg) {
            lastReadTime = new Date(lastReadMsg.createdAt).getTime();
          }
        }

        return [
          ...prev,
          ...uniqueNewMessages.map((msg) => {
            const msgTime = new Date(msg.createdAt).getTime();
            // 如果有已读时间戳且消息时间 <= 已读时间，标记为 read
            const status =
              lastReadTime !== null && msgTime <= lastReadTime
                ? ("read" as const)
                : ("sent" as const);
            return {
              ...msg,
              status,
            };
          }),
        ];
      });
    },
    [],
  );

  return {
    messages,
    addOptimisticMessage,
    updateMessageStatus,
    markMessageFailed,
    retryMessage,
    removeMessage,
    addMessages,
    updateReadStatus,
    resetMessages,
    appendMessages,
  };
}
