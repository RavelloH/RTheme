"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type {
  Conversation,
  ConversationUser,
  Message,
} from "@repo/shared-types/api/message";
import { useMessagePolling } from "@/hooks/use-message-polling";
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const conversationIdParam = searchParams.get("id");
  const targetUidParam = searchParams.get("uid");

  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [total, setTotal] = useState(initialTotal);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(conversationIdParam);
  const [temporaryTargetUser, setTemporaryTargetUser] =
    useState<ConversationUser | null>(null);
  const [_isLoadingTargetUser, setIsLoadingTargetUser] = useState(false);

  // 同步 URL 参数和选中的会话
  useEffect(() => {
    setSelectedConversationId(conversationIdParam);
  }, [conversationIdParam]);

  // 处理 uid 参数：加载目标用户信息
  useEffect(() => {
    if (targetUidParam) {
      const targetUid = parseInt(targetUidParam, 10);
      if (isNaN(targetUid)) return;

      // 先检查是否已有会话
      const existingConversation = conversations.find(
        (conv) => conv.otherUser.uid === targetUid,
      );

      if (existingConversation) {
        // 如果已有会话，直接跳转到该会话
        router.replace(`/messages?id=${existingConversation.conversationId}`);
        return;
      }

      // 加载目标用户信息
      setIsLoadingTargetUser(true);
      import("@/actions/message")
        .then(async ({ searchUsers }) => {
          const result = await searchUsers(targetUidParam);
          if (result.success && result.data && result.data.users.length > 0) {
            setTemporaryTargetUser(result.data.users[0] || null);
          } else {
            setTemporaryTargetUser(null);
          }
        })
        .catch((error) => {
          console.error("加载用户信息失败:", error);
          setTemporaryTargetUser(null);
        })
        .finally(() => {
          setIsLoadingTargetUser(false);
        });
    } else {
      setTemporaryTargetUser(null);
    }
  }, [targetUidParam, conversations, router]);

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
    },
    [selectedConversationId],
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

  // 当会话切换时，清空轮询消息缓存
  useEffect(() => {
    setCurrentConversationMessages([]);
    setPolledOtherUserLastReadMessageId(null);
  }, [selectedConversationId]);

  // 启用轮询
  useMessagePolling({
    enabled: true,
    onConversationsUpdate: handleConversationsUpdate,
    onCurrentConversationUpdate: handleCurrentConversationUpdate,
    currentConversationId: selectedConversationId,
  });

  // 处理会话选择
  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      // 立即更新本地会话列表，清除未读数
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversationId === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv,
        ),
      );

      const newUrl = `/messages?id=${conversationId}`;

      if (isModal) {
        // 模态框模式：使用 replaceState 纯客户端更新 URL，不触发路由导航
        window.history.replaceState(null, "", newUrl);
        // 手动更新内部状态
        setSelectedConversationId(conversationId);
      } else {
        // 全屏模式：使用 replace 避免历史记录堆积
        router.replace(newUrl);
      }
    },
    [router, isModal],
  );

  // 处理新会话
  const handleNewConversation = useCallback(
    async (uid: number) => {
      const newUrl = `/messages?uid=${uid}`;

      // 先检查是否已有会话
      const existingConversation = conversations.find(
        (conv) => conv.otherUser.uid === uid,
      );

      if (existingConversation) {
        // 如果已有会话，直接跳转
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
            setTemporaryTargetUser(user);

            // 更新 URL
            if (isModal) {
              window.history.replaceState(null, "", newUrl);
              setSelectedConversationId(null); // 清空选中的会话
            } else {
              router.replace(newUrl);
            }
          }
        }
      } catch (error) {
        console.error("加载用户信息失败:", error);
      } finally {
        setIsLoadingTargetUser(false);
      }
    },
    [conversations, isModal, router, handleSelectConversation],
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
        router.push("/messages");
      }
    },
    [selectedConversationId, router],
  );

  // 处理消息发送成功（立即更新会话列表）
  const handleMessageSent = useCallback(
    (conversationId: string, message: Message) => {
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
    [],
  );

  // 处理加载更多会话
  const handleLoadMore = useCallback(async (skip: number) => {
    const { getConversations } = await import("@/actions/message");
    const result = await getConversations(undefined, skip, 20);

    if (result.success && result.data) {
      setConversations((prev) => [...prev, ...result.data!.conversations]);
      setHasMore(result.data.hasMore);
    }
  }, []);

  // 处理新会话创建成功
  const handleConversationCreated = useCallback(
    (conversationId: string) => {
      // 会话创建后，立即清除未读标记并更新 URL
      setConversations((prev) =>
        prev.map((conv) =>
          conv.conversationId === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv,
        ),
      );

      const newUrl = `/messages?id=${conversationId}`;

      if (isModal) {
        // 模态框模式：使用 replaceState 纯客户端更新 URL
        window.history.replaceState(null, "", newUrl);
        setSelectedConversationId(conversationId);
      } else {
        // 全屏模式：使用 replace
        router.replace(newUrl);
      }

      setTemporaryTargetUser(null);
    },
    [router, isModal],
  );

  // 获取当前选中的会话信息
  const selectedConversation = conversations.find(
    (conv) => conv.conversationId === selectedConversationId,
  );

  // 判断是否显示聊天窗口
  const shouldShowChatWindow = selectedConversation || temporaryTargetUser;

  return (
    <div className="flex h-full bg-background">
      {/* 左侧：会话列表 */}
      <div
        className={`flex-shrink-0 border-r border-foreground/10 bg-background ${
          isModal ? "w-80" : "w-96"
        }`}
      >
        <ConversationList
          conversations={conversations}
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
            key={
              selectedConversation?.otherUser.uid || temporaryTargetUser?.uid
            }
            conversation={selectedConversation}
            temporaryTargetUser={temporaryTargetUser}
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
