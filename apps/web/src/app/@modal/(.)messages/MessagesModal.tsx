"use client";

import { useState } from "react";
import { RiQuestionAnswerLine } from "@remixicon/react";
import type { Conversation } from "@repo/shared-types/api/message";
import { useRouter } from "next/navigation";

import MessagesClient from "@/components/client/features/chat/MessagesClient";
import { useNavigateWithTransition } from "@/components/ui/Link";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";

interface MessagesModalProps {
  initialConversations: Conversation[];
  initialTotal: number;
  initialHasMore: boolean;
  currentUserId: number;
  isAuthenticated?: boolean;
  redirectTarget?: string;
}

export default function MessagesModal({
  initialConversations,
  initialTotal,
  initialHasMore,
  currentUserId,
  isAuthenticated = true,
  redirectTarget = "/messages",
}: MessagesModalProps) {
  const router = useRouter();
  const navigate = useNavigateWithTransition();
  const [isOpen, setIsOpen] = useState(true);
  const encodedRedirectTarget = encodeURIComponent(redirectTarget);
  const loginHref = `/login?redirect=${encodedRedirectTarget}`;
  const registerHref = `/register?redirect=${encodedRedirectTarget}`;

  const handleClose = (targetPath?: string) => {
    // 先关闭 Dialog，播放退出动画
    setIsOpen(false);
    // 等待动画完成后再执行路由跳转（Dialog 的动画时长是 200ms）
    setTimeout(() => {
      if (targetPath) {
        // 如果有目标路径，先 back 再跳转到目标页面
        router.back();
        // 再等待一小段时间让 back 完成
        setTimeout(() => {
          navigate(targetPath);
        }, 50);
      } else {
        // 只是关闭模态框
        router.back();
      }
    }, 200);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => handleClose()}
      title="私信"
      size="xl"
      showCloseButton={true}
      dismissable={true}
    >
      {isAuthenticated ? (
        <div className="h-[calc(90vh-8em)]">
          <MessagesClient
            initialConversations={initialConversations}
            initialTotal={initialTotal}
            initialHasMore={initialHasMore}
            currentUserId={currentUserId}
            isModal={true}
            onRequestClose={handleClose}
          />
        </div>
      ) : (
        <div className="h-[calc(90vh-8em)] flex flex-col items-center justify-center text-center px-6 text-muted-foreground">
          <RiQuestionAnswerLine size="4em" className="mb-4" />
          <p className="text-lg">私信功能需要登录后使用</p>
          <div className="mt-4 flex items-center gap-3">
            <Button
              label="登录"
              size="sm"
              variant="secondary"
              onClick={() => handleClose(loginHref)}
            />
            <Button
              label="注册"
              size="sm"
              variant="primary"
              onClick={() => handleClose(registerHref)}
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}
