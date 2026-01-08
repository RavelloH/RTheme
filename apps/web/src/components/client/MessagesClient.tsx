"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type {
  Conversation,
  ConversationUser,
  Message,
} from "@repo/shared-types/api/message";
import { useMessagePolling } from "@/hooks/use-message-polling";
import { useNotification } from "@/components/NotificationProvider";
import ConversationList from "./ConversationList";
import ChatWindow from "./ChatWindow";
import { RiQuestionAnswerLine } from "@remixicon/react";
import { AutoTransition } from "@/ui/AutoTransition";

interface MessagesClientProps {
  initialConversations: Conversation[];
  initialTotal: number;
  initialHasMore: boolean;
  currentUserId: number;
  isModal?: boolean;
  onRequestClose?: (targetPath?: string) => void;
}

export default function MessagesClient({
  initialConversations,
  initialTotal,
  initialHasMore,
  currentUserId,
  isModal = false,
}: MessagesClientProps) {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [temporaryTargetUser, setTemporaryTargetUser] =
    useState<ConversationUser | null>(null);
  const [temporaryLastMessage, setTemporaryLastMessage] = useState<{
    content: string;
    createdAt: Date;
    senderUid: number;
  } | null>(null);
  const [_isLoadingTargetUser, setIsLoadingTargetUser] = useState(false);
  const searchParams = useSearchParams();
  const { removeMessageNotificationsByConversation } = useNotification();

  // 处理会话更新（轮询回调）
  const handleConversationsUpdate = useCallback(
    (updatedConversations: Conversation[]) => {
      setConversations((prev) => {
        // 创建一个 Map 用于快速查找
        const updatedMap = new Map(
          updatedConversations.map((conv) => [conv.conversationId, conv]),
        );

        // 更新现有会话或添加新会话
        const merged = prev.map((conv) => {
          const updated = updatedMap.get(conv.conversationId);
          if (updated) {
            updatedMap.delete(conv.conversationId);

            // 如果本地的 lastMessageAt 更新（说明有乐观更新），保留本地数据
            const localTime = new Date(conv.lastMessageAt).getTime();
            const serverTime = new Date(updated.lastMessageAt).getTime();

            if (localTime > serverTime) {
              // 本地数据更新，保留本地的 lastMessage 和 lastMessageAt
              return {
                ...updated,
                lastMessage: conv.lastMessage,
                lastMessageAt: conv.lastMessageAt,
              };
            }

            return updated;
          }
          return conv;
        });

        // 添加新的会话到开头
        const newConversations = Array.from(updatedMap.values());
        const allConversations = [...newConversations, ...merged];

        // 按最后一条消息的时间降序排序（最新的在前面）
        // 使用 lastMessageAt 字段（从数据库获取），只在有新消息时更新，不在标记已读时更新
        return allConversations.sort((a, b) => {
          const aTime = new Date(a.lastMessageAt).getTime();
          const bTime = new Date(b.lastMessageAt).getTime();
          return bTime - aTime;
        });
      });

      // 如果当前打开的会话在更新列表中，更新其已读状态
      if (selectedConversationId) {
        const currentConvUpdated = updatedConversations.find(
          (conv) => conv.conversationId === selectedConversationId,
        );
        if (currentConvUpdated?.otherUserLastReadMessageId) {
          setPolledOtherUserLastReadMessageId(
            currentConvUpdated.otherUserLastReadMessageId,
          );
        }
      }

      // 如果有临时用户，检查是否有对应的正式会话出现
      if (temporaryTargetUser) {
        const matchingConversation = updatedConversations.find(
          (conv) => conv.otherUser.uid === temporaryTargetUser.uid,
        );
        if (matchingConversation) {
          // 找到对应的正式会话，切换过去
          setTemporaryTargetUser(null);
          setTemporaryLastMessage(null);
          // 只有当前选中的是临时会话时才切换到正式会话
          if (
            selectedConversationId?.startsWith(
              `temp-${temporaryTargetUser.uid}`,
            )
          ) {
            setSelectedConversationId(matchingConversation.conversationId);
          }
        }
      }
    },
    [selectedConversationId, temporaryTargetUser],
  );

  // 处理当前会话消息更新（轮询回调）
  const [currentConversationMessages, setCurrentConversationMessages] =
    useState<Message[]>([]);
  const [
    polledOtherUserLastReadMessageId,
    setPolledOtherUserLastReadMessageId,
  ] = useState<string | null>(null);

  const handleCurrentConversationUpdate = useCallback(
    (messages: Message[], otherUserLastReadMessageId: string | null) => {
      setCurrentConversationMessages(messages);
      setPolledOtherUserLastReadMessageId(otherUserLastReadMessageId);
    },
    [],
  );

  // 启用轮询
  useMessagePolling({
    enabled: true,
    onConversationsUpdate: handleConversationsUpdate,
    onCurrentConversationUpdate: handleCurrentConversationUpdate,
    currentConversationId: selectedConversationId,
  });

  // 当选中的会话变化时，清空当前会话消息
  useEffect(() => {
    setCurrentConversationMessages([]);
    setPolledOtherUserLastReadMessageId(null);
  }, [selectedConversationId]);

  // 当 selectedConversationId 变化时，清空轮询消息缓存
  useEffect(() => {
    setCurrentConversationMessages([]);
    setPolledOtherUserLastReadMessageId(null);
  }, [selectedConversationId]);

  // 处理会话选择
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      // 如果是临时会话，只设置选中状态，不做其他处理
      if (conversationId.startsWith("temp-")) {
        setSelectedConversationId(conversationId);
        return;
      }

      // 移除该会话的所有消息通知
      removeMessageNotificationsByConversation?.(conversationId);

      // 立即更新本地会话列表，清除未读数
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversationId === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv,
        ),
      );

      // 选择会话，不清空临时用户（允许临时会话继续存在于列表中）
      setSelectedConversationId(conversationId);
    },
    [removeMessageNotificationsByConversation],
  );

  // 处理 URL 中的 conversation 参数，自动打开指定会话
  useEffect(() => {
    const conversationId = searchParams.get("conversation");
    if (conversationId && conversations.length > 0) {
      // 检查该会话是否存在
      const conversation = conversations.find(
        (conv) => conv.conversationId === conversationId,
      );
      if (conversation && selectedConversationId !== conversationId) {
        handleSelectConversation(conversationId);

        // 清除 URL 中的 conversation 参数，避免重复触发
        const url = new URL(window.location.href);
        url.searchParams.delete("conversation");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [
    searchParams,
    conversations,
    selectedConversationId,
    handleSelectConversation,
  ]);

  // 处理新会话
  const handleNewConversation = useCallback(
    async (uid: number) => {
      // 先检查是否已有会话
      const existingConversation = conversations.find(
        (conv) => conv.otherUser.uid === uid,
      );

      if (existingConversation) {
        // 如果已有会话，直接选择
        handleSelectConversation(existingConversation.conversationId);
        return;
      }

      // 加载目标用户信息
      setIsLoadingTargetUser(true);
      try {
        const { searchUsers } = await import("@/actions/message");
        const result = await searchUsers(uid.toString());

        if (result.success && result.data && result.data.users.length > 0) {
          const user = result.data.users[0];
          if (user) {
            // 设置临时用户并选中临时会话
            setTemporaryTargetUser(user);
            setTemporaryLastMessage(null);
            setSelectedConversationId(`temp-${user.uid}`);
          }
        }
      } catch (error) {
        console.error("加载用户信息失败:", error);
      } finally {
        setIsLoadingTargetUser(false);
      }
    },
    [conversations, handleSelectConversation],
  );

  // 处理会话删除
  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      setConversations((prev) =>
        prev.filter((conv) => conv.conversationId !== conversationId),
      );
      setTotal((prev) => prev - 1);

      // 如果删除的是当前选中的会话，清空选择
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
    },
    [selectedConversationId],
  );

  // 处理消息发送成功（立即更新会话列表）
  const handleMessageSent = useCallback(
    (conversationId: string, message: Message) => {
      // 如果有临时用户，说明是临时会话发送的第一条消息
      // 此时 conversationId 是新创建的正式会话 ID，但我们需要更新临时会话的显示
      if (temporaryTargetUser) {
        setTemporaryLastMessage({
          content: message.content,
          createdAt: message.createdAt,
          senderUid: message.senderUid,
        });
        return;
      }

      setConversations((prev) => {
        // 找到对应的会话
        const targetConv = prev.find(
          (conv) => conv.conversationId === conversationId,
        );
        if (!targetConv) return prev;

        // 更新会话的最后消息和时间
        const updatedConv = {
          ...targetConv,
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            senderUid: message.senderUid,
          },
          updatedAt: message.createdAt,
          lastMessageAt: message.createdAt, // 更新最后消息时间
        };

        // 将更新后的会话移到列表顶部
        const otherConvs = prev.filter(
          (conv) => conv.conversationId !== conversationId,
        );
        return [updatedConv, ...otherConvs];
      });
    },
    [temporaryTargetUser],
  );

  // 处理加载更多会话
  const handleLoadMore = useCallback(
    async (skip: number) => {
      // 如果有临时会话,需要减去1(临时会话不应计入 skip)
      const actualSkip = temporaryTargetUser ? skip - 1 : skip;
      if (actualSkip < 0) return; // 防止负数

      const { getConversations } = await import("@/actions/message");
      const result = await getConversations(undefined, actualSkip, 20);

      if (result.success && result.data) {
        setConversations((prev) => [...prev, ...result.data!.conversations]);
        setHasMore(result.data.hasMore);
      }
    },
    [temporaryTargetUser],
  );

  // 处理新会话创建成功
  const handleConversationCreated = useCallback((conversationId: string) => {
    // 会话创建后，清除未读标记
    setConversations((prev) =>
      prev.map((conv) =>
        conv.conversationId === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv,
      ),
    );

    // 不立即设置 selectedConversationId 或清空 temporaryTargetUser
    // 保持临时会话状态，让轮询自然检测到新会话后自动切换
    // 这样可以避免中间状态的加载指示器闪现
  }, []);

  // 获取当前选中的会话信息
  const selectedConversation = conversations.find(
    (conv) => conv.conversationId === selectedConversationId,
  );

  // 构建完整的会话列表(包含临时会话)
  const allConversations = temporaryTargetUser
    ? [
        // 临时会话(虚拟对象,仅在内存中)
        {
          conversationId: `temp-${temporaryTargetUser.uid}`,
          otherUser: temporaryTargetUser,
          lastMessage: temporaryLastMessage,
          unreadCount: 0,
          updatedAt: new Date(),
          lastMessageAt: new Date(),
          otherUserLastReadMessageId: null,
        },
        ...conversations,
      ]
    : conversations;

  // 判断是否显示聊天窗口
  // 如果 selectedConversationId 存在（无论是临时会话还是正式会话），就显示聊天窗口
  const shouldShowChatWindow = !!selectedConversationId;

  // 确定要显示的会话：优先使用 selectedConversation，如果是临时会话则使用 null
  const conversationToShow = selectedConversationId?.startsWith("temp-")
    ? undefined
    : selectedConversation;

  // 确定要显示的临时用户：只有当选中的是临时会话时才传递
  const temporaryUserToShow = selectedConversationId?.startsWith("temp-")
    ? temporaryTargetUser
    : null;

  return (
    <div className="flex h-full bg-background">
      {/* 左侧：会话列表 */}
      <div
        className={`flex-shrink-0 border-r border-foreground/10 bg-background ${
          isModal ? "w-80" : "w-96"
        }`}
      >
        <ConversationList
          conversations={allConversations}
          selectedConversationId={selectedConversationId}
          currentUserId={currentUserId}
          hasMore={hasMore}
          total={total}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onLoadMore={handleLoadMore}
          isModal={isModal}
          onNewConversation={handleNewConversation}
        />
      </div>

      {/* 右侧：聊天窗口 */}
      <AutoTransition className="flex-1 flex flex-col">
        {shouldShowChatWindow ? (
          <ChatWindow
            conversationKey={selectedConversationId || "unknown"}
            conversation={conversationToShow}
            temporaryTargetUser={temporaryUserToShow}
            currentUserId={currentUserId}
            onDeleteConversation={handleDeleteConversation}
            onConversationCreated={handleConversationCreated}
            onMessageSent={handleMessageSent}
            polledMessages={currentConversationMessages}
            polledOtherUserLastReadMessageId={polledOtherUserLastReadMessageId}
          />
        ) : (
          <div
            className="flex-1 flex flex-col items-center justify-center text-muted-foreground"
            key="empty-state"
          >
            <RiQuestionAnswerLine size="4em" className="mb-4" />
            <p className="text-lg">选择一个会话来开始聊天</p>
          </div>
        )}
      </AutoTransition>
    </div>
  );
}
