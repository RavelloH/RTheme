import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { getConversations, getConversationMessages } from "@/actions/message";
import type { Conversation, Message } from "@repo/shared-types/api/message";
import { useBroadcastSender } from "@/hooks/use-broadcast";

interface UseMessagePollingOptions {
  enabled: boolean;
  onConversationsUpdate?: (conversations: Conversation[]) => void;
  onCurrentConversationUpdate?: (
    messages: Message[],
    otherUserLastReadMessageId: string | null,
  ) => void;
  currentConversationId?: string | null;
}

/**
 * 消息轮询 Hook (基于 SWR)
 * 每 3 秒轮询一次会话列表，检测更新
 * 如果当前有打开的会话，同时获取该会话的新消息
 */
export function useMessagePolling({
  enabled,
  onConversationsUpdate,
  onCurrentConversationUpdate,
  currentConversationId,
}: UseMessagePollingOptions) {
  const lastPolledAtRef = useRef<Date | undefined>(undefined);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { broadcast } = useBroadcastSender();

  // 当路由或搜索参数变化时，重置轮询时间戳（强制全量获取）
  useEffect(() => {
    lastPolledAtRef.current = undefined;
  }, [pathname, searchParams]);

  // 使用 SWR 轮询会话列表
  const { data: conversationsData } = useSWR(
    enabled ? ["conversations", lastPolledAtRef.current] : null,
    async ([_, lastPolledAt]) => {
      const result = await getConversations(lastPolledAt, 0, 20);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    },
    {
      refreshInterval: 3000, // 3秒轮询
      dedupingInterval: 1000, // 1秒内去重
      revalidateOnFocus: true, // 窗口获得焦点时重新验证
      revalidateOnReconnect: true, // 重新连接时重新验证
      shouldRetryOnError: false, // 错误时不重试
    },
  );

  // 使用 SWR 轮询当前会话消息（仅在有当前会话时）
  // 注意：不依赖 conversationsData，只要有 currentConversationId 就持续轮询
  // 这样即使会话列表的增量查询没有返回当前会话，消息轮询仍然能获取到已读状态更新
  const { data: messagesData } = useSWR(
    enabled && currentConversationId
      ? ["conversation-messages", currentConversationId]
      : null,
    async ([_, convId]) => {
      const result = await getConversationMessages(convId, 0, 25);
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    },
    {
      refreshInterval: 3000, // 3秒轮询
      dedupingInterval: 1000, // 1秒内去重
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
      // 强制比较完整数据，确保 otherUserLastReadMessageId 变化时能触发更新
      compare: (a, b) => {
        if (a === b) return true;
        if (!a || !b) return false;
        // 比较消息数组长度和 otherUserLastReadMessageId
        return (
          a.messages.length === b.messages.length &&
          a.otherUserLastReadMessageId === b.otherUserLastReadMessageId &&
          (a.messages.length === 0 ||
            a.messages[a.messages.length - 1]?.id ===
              b.messages[b.messages.length - 1]?.id)
        );
      },
    },
  );

  // 处理会话列表更新
  useEffect(() => {
    if (
      conversationsData?.conversations &&
      conversationsData.conversations.length > 0
    ) {
      onConversationsUpdate?.(conversationsData.conversations);
      // 更新轮询时间戳
      lastPolledAtRef.current = new Date();
    }
  }, [conversationsData, onConversationsUpdate]);

  // 处理当前会话消息更新
  useEffect(() => {
    if (messagesData?.messages) {
      onCurrentConversationUpdate?.(
        messagesData.messages,
        messagesData.otherUserLastReadMessageId,
      );

      // 如果响应中包含私信未读数，更新 localStorage 并广播
      if (typeof messagesData.unreadMessageCount === "number") {
        const count = messagesData.unreadMessageCount;

        // 更新 localStorage
        localStorage.setItem(
          "unread_message_count",
          JSON.stringify({ count, cachedAt: Date.now() }),
        );

        // 广播给其他组件
        broadcast({ type: "unread_message_count_update", count });
      }
    }
  }, [
    messagesData,
    onCurrentConversationUpdate,
    currentConversationId,
    broadcast,
  ]);

  return {
    // 手动触发轮询（通过 SWR 的 mutate）
    triggerPoll: () => {
      // SWR 会自动重新验证数据
    },
  };
}
