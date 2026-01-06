"use client";

import { useState, useEffect, useRef } from "react";
import type {
  Conversation,
  ConversationUser,
  Message,
} from "@repo/shared-types/api/message";
import { useOptimisticMessages } from "@/hooks/use-optimistic-messages";
import { sendMessage } from "@/actions/message";
import UserAvatar from "@/components/UserAvatar";
import MessageList from "./MessageList";
import type { MessageListRef } from "./MessageList";
import MessageInput from "./MessageInput";
import NewMessageFloatingNotice from "./NewMessageFloatingNotice";
import { Button } from "@/ui/Button";
import { AlertDialog } from "@/ui/AlertDialog";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { useToast } from "@/ui/Toast";
import { RiMoreLine, RiDeleteBinLine } from "@remixicon/react";
import {
  Menu,
  MenuItem,
  MenuTrigger,
  MenuContent,
  MenuAction,
} from "@/ui/Menu";
import { AutoTransition } from "@/ui/AutoTransition";

interface ChatWindowProps {
  conversation?: Conversation; // 可选，临时会话时为空
  temporaryTargetUser?: ConversationUser | null; // 临时目标用户
  currentUserId: number;
  onDeleteConversation: (conversationId: string) => void;
  onConversationCreated?: (conversationId: string) => void; // 会话创建回调
  onMessageSent?: (conversationId: string, message: Message) => void; // 消息发送成功回调
  polledMessages?: Message[]; // 轮询获取的消息
  polledOtherUserLastReadMessageId?: string | null; // 轮询获取的对方已读消息ID
}

export default function ChatWindow({
  conversation,
  temporaryTargetUser,
  currentUserId,
  onDeleteConversation,
  onConversationCreated,
  onMessageSent,
  polledMessages = [],
  polledOtherUserLastReadMessageId = null,
}: ChatWindowProps) {
  // 使用现有会话或临时用户信息
  const otherUser = conversation?.otherUser || temporaryTargetUser;
  const conversationId = conversation?.conversationId;
  const isTemporaryConversation = !conversation && !!temporaryTargetUser;

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNewMessageNotice, setShowNewMessageNotice] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [otherUserLastReadMessageId, setOtherUserLastReadMessageId] = useState<
    string | null
  >(null);
  const messageListRef = useRef<MessageListRef>(null);
  const toast = useToast();
  const lastMessageIdRef = useRef<string | null>(null); // 记录最后一条消息的 ID

  const {
    messages,
    addOptimisticMessage,
    updateMessageStatus,
    markMessageFailed,
    retryMessage,
    updateReadStatus,
    resetMessages,
    appendMessages,
    addMessages,
  } = useOptimisticMessages();

  // 当会话切换时，立即清空消息（避免显示上一个会话的内容）
  useEffect(() => {
    resetMessages([]);
    setOtherUserLastReadMessageId(null);
    setIsLoadingMessages(true); // 开始加载
    setShowNewMessageNotice(false); // 隐藏新消息提示
    setNewMessageCount(0); // 重置计数
    lastMessageIdRef.current = null; // 重置最后一条消息 ID
  }, [conversationId, resetMessages]);

  // 加载初始消息
  useEffect(() => {
    const loadInitialMessages = async () => {
      if (!conversationId) {
        setIsLoadingMessages(false);
        return;
      }

      try {
        setIsLoadingMessages(true);
        const { getConversationMessages } = await import("@/actions/message");
        const result = await getConversationMessages(conversationId, 0, 25);

        if (result.success && result.data) {
          // 完全使用服务器数据，不保留本地乐观消息
          resetMessages(result.data.messages);

          // 初始化最后一条消息 ID
          if (result.data.messages.length > 0) {
            const lastMsg =
              result.data.messages[result.data.messages.length - 1];
            if (lastMsg) {
              lastMessageIdRef.current = lastMsg.id;
            }
          }

          // 立即应用已读状态
          if (result.data.otherUserLastReadMessageId) {
            updateReadStatus(result.data.otherUserLastReadMessageId);
            setOtherUserLastReadMessageId(
              result.data.otherUserLastReadMessageId,
            );
          }
        }
      } catch (error) {
        console.error("加载消息失败:", error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    loadInitialMessages();
  }, [conversationId, resetMessages, updateReadStatus]);

  // 处理轮询获取的新消息
  useEffect(() => {
    if (polledMessages.length > 0) {
      appendMessages(polledMessages);
    }
  }, [polledMessages, appendMessages]);

  // 处理轮询获取的已读状态更新
  useEffect(() => {
    if (polledOtherUserLastReadMessageId) {
      setOtherUserLastReadMessageId(polledOtherUserLastReadMessageId);
    }
  }, [polledOtherUserLastReadMessageId]);

  // 更新已读状态（显示双对勾）
  useEffect(() => {
    if (otherUserLastReadMessageId) {
      updateReadStatus(otherUserLastReadMessageId);
    }
  }, [otherUserLastReadMessageId, updateReadStatus]);

  // 处理加载更多历史消息
  const handleLoadMoreMessages = async (skip: number): Promise<boolean> => {
    if (!conversationId) return false;

    try {
      const { getConversationMessages } = await import("@/actions/message");
      const result = await getConversationMessages(conversationId, skip, 25);

      if (result.success && result.data) {
        addMessages(result.data.messages);
        // 更新已读状态
        if (result.data.otherUserLastReadMessageId) {
          setOtherUserLastReadMessageId(result.data.otherUserLastReadMessageId);
        }
        return result.data.hasMore;
      }
      return false;
    } catch (error) {
      console.error("加载更多消息失败:", error);
      return false;
    }
  };

  // 处理发送消息
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !otherUser) return;

    // 添加乐观消息
    const tempId = addOptimisticMessage(content, currentUserId);

    try {
      const result = await sendMessage(otherUser.uid, content, tempId);

      if (result.success && result.data) {
        // 更新消息状态，用真实 ID 替换临时 ID
        updateMessageStatus(tempId, result.data.message, "sent");

        // 如果是临时会话且会话被创建，调用回调
        if (
          isTemporaryConversation &&
          result.data.conversationId &&
          onConversationCreated
        ) {
          onConversationCreated(result.data.conversationId);
        }

        // 通知父组件消息已发送（用于更新会话列表）
        if (onMessageSent && result.data.conversationId) {
          onMessageSent(result.data.conversationId, result.data.message);
        }

        // 滚动到底部
        if (messageListRef.current) {
          messageListRef.current.scrollToBottom();
        }
      } else {
        // 标记为失败
        markMessageFailed(tempId);

        // 显示错误提示
        toast.error(result.error?.message || "发送失败");
      }
    } catch {
      markMessageFailed(tempId);
      toast.error("发送失败，请重试");
    }
  };

  // 处理重试发送
  const handleRetryMessage = async (tempId: string, content: string) => {
    if (!otherUser) return;

    retryMessage(tempId);

    try {
      const result = await sendMessage(otherUser.uid, content, tempId);

      if (result.success && result.data) {
        updateMessageStatus(tempId, result.data.message, "sent");

        // 如果是临时会话且会话被创建，调用回调
        if (
          isTemporaryConversation &&
          result.data.conversationId &&
          onConversationCreated
        ) {
          onConversationCreated(result.data.conversationId);
        }

        // 通知父组件消息已发送（用于更新会话列表）
        if (onMessageSent && result.data.conversationId) {
          onMessageSent(result.data.conversationId, result.data.message);
        }
      } else {
        markMessageFailed(tempId);
        toast.error(result.error?.message || "发送失败");
      }
    } catch {
      markMessageFailed(tempId);
      toast.error("发送失败，请重试");
    }
  };

  // 处理删除会话
  const handleDeleteConversation = async () => {
    if (!conversationId) return; // 临时会话不能删除

    setIsDeleting(true);
    try {
      const { deleteConversation } = await import("@/actions/message");
      const result = await deleteConversation(conversationId);

      if (result.success) {
        setShowDeleteDialog(false);
        onDeleteConversation(conversationId);
        toast.success("会话已删除");
      } else {
        toast.error(result.error?.message || "删除失败");
      }
    } catch {
      toast.error("删除失败，请重试");
    } finally {
      setIsDeleting(false);
    }
  };

  // 处理滚动位置变化
  const handleScrollChange = (atBottom: boolean) => {
    setIsAtBottom(atBottom);

    // 如果滚动到底部，隐藏新消息提示并重置计数
    if (atBottom) {
      setShowNewMessageNotice(false);
      setNewMessageCount(0);
      // 更新最后一条消息 ID
      if (messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg) {
          lastMessageIdRef.current = lastMsg.id;
        }
      }
    }
  };

  // 监听新消息，如果不在底部显示提示并计数
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      return;
    }

    // 检查是否有新消息（通过最后一条消息的 ID 判断）
    const isNewMessage = lastMessageIdRef.current !== lastMessage.id;

    if (isNewMessage && !isAtBottom) {
      // 只有当最后一条消息是对方发的，才显示提示
      if (lastMessage.senderUid !== currentUserId) {
        // 计算新消息数量：找到上次记录的消息 ID 之后的所有消息
        let newCount = 0;
        for (let i = messages.length - 1; i >= 0; i--) {
          const msg = messages[i];
          if (msg && msg.id === lastMessageIdRef.current) {
            break;
          }
          if (msg && msg.senderUid !== currentUserId) {
            newCount++;
          }
        }

        if (newCount > 0) {
          setShowNewMessageNotice(true);
          setNewMessageCount(newCount);
        }
      }

      // 更新最后一条消息 ID
      lastMessageIdRef.current = lastMessage.id;
    }
  }, [messages, isAtBottom, currentUserId]);

  // 处理点击新消息提示 - 使用平滑滚动
  const handleScrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollToBottom(true); // 启用平滑滚动
    }
    setShowNewMessageNotice(false);
    setNewMessageCount(0);
  };

  // 如果没有用户信息，返回空
  if (!otherUser) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
        <p>加载用户信息失败</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-foreground/10 bg-background">
        <div className="flex items-center justify-between">
          {/* 用户信息 */}
          <div className="flex items-center gap-3">
            <UserAvatar
              username={otherUser.nickname || otherUser.username}
              avatarUrl={otherUser.avatar}
              emailMd5={otherUser.emailMd5}
              shape="circle"
              className="!block w-10 h-10"
            />
            <div>
              <h2 className="font-semibold text-foreground">
                {otherUser.nickname || otherUser.username}
              </h2>
              <p className="text-xs text-muted-foreground">
                @{otherUser.username}
              </p>
            </div>
          </div>

          {/* 更多菜单（仅在非临时会话时显示） */}
          {!isTemporaryConversation && (
            <Menu orientation="vertical">
              <MenuItem value="more">
                <MenuTrigger asChild>
                  <Button
                    label=""
                    variant="ghost"
                    size="sm"
                    icon={<RiMoreLine size="1.2em" />}
                    iconPosition="left"
                    aria-label="更多操作"
                  />
                </MenuTrigger>
                <MenuContent align="end" minWidth={160}>
                  <MenuAction
                    icon={<RiDeleteBinLine size="1em" className="text-error" />}
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-error"
                  >
                    删除会话
                  </MenuAction>
                </MenuContent>
              </MenuItem>
            </Menu>
          )}
        </div>
      </div>

      {/* 消息列表 */}
      <AutoTransition className="flex-1 relative overflow-hidden">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <LoadingIndicator size="md" />
          </div>
        ) : (
          <MessageList
            ref={messageListRef}
            messages={messages}
            currentUserId={currentUserId}
            conversationId={conversationId || ""}
            onScrollChange={handleScrollChange}
            onRetryMessage={handleRetryMessage}
            onLoadMoreMessages={handleLoadMoreMessages}
          />
        )}

        {/* 新消息提示 */}
        <AutoTransition type="slideUp">
          {showNewMessageNotice && (
            <NewMessageFloatingNotice
              onClick={handleScrollToBottom}
              count={newMessageCount}
            />
          )}
        </AutoTransition>
      </AutoTransition>

      {/* 输入框 */}
      <div className="flex-shrink-0 border-t border-foreground/10 bg-background">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="删除会话"
        description={`确定要删除与 ${otherUser.nickname || otherUser.username} 的会话吗？此操作不可恢复。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDeleteConversation}
        loading={isDeleting}
        variant="danger"
      />
    </div>
  );
}
