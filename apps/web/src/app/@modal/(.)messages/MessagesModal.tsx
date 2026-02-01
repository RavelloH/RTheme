"use client";

import { useState } from "react";
import type { Conversation } from "@repo/shared-types/api/message";
import { useRouter } from "next/navigation";

import MessagesClient from "@/components/client/MessagesClient";
import { useNavigateWithTransition } from "@/components/Link";
import { Dialog } from "@/ui/Dialog";

interface MessagesModalProps {
  initialConversations: Conversation[];
  initialTotal: number;
  initialHasMore: boolean;
  currentUserId: number;
}

export default function MessagesModal({
  initialConversations,
  initialTotal,
  initialHasMore,
  currentUserId,
}: MessagesModalProps) {
  const router = useRouter();
  const navigate = useNavigateWithTransition();
  const [isOpen, setIsOpen] = useState(true);

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
    </Dialog>
  );
}
