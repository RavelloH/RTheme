"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/ui/Dialog";
import { useNavigateWithTransition } from "@/components/Link";
import NotificationsClient from "@/app/(account)/notifications/NotificationsClient";

interface NotificationsModalProps {
  unreadNotices: Array<{
    id: string;
    title: string;
    content: string;
    link: string | null;
    isRead: boolean;
    createdAt: string; // ISO 8601 格式
  }>;
  readNotices: Array<{
    id: string;
    title: string;
    content: string;
    link: string | null;
    isRead: boolean;
    createdAt: string; // ISO 8601 格式
  }>;
  totalReadCount: number; // 已读通知总数
  hasMoreRead?: boolean; // 是否有更多已读通知
}

export default function NotificationsModal({
  unreadNotices,
  readNotices,
  totalReadCount,
  hasMoreRead = false,
}: NotificationsModalProps) {
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
      title="通知中心"
      size="lg"
      showCloseButton={true}
      dismissable={true}
    >
      <div className="h-[calc(90vh-10em)]">
        <NotificationsClient
          unreadNotices={unreadNotices}
          readNotices={readNotices}
          totalReadCount={totalReadCount}
          hasMoreRead={hasMoreRead}
          isModal={true}
          onRequestClose={handleClose}
        />
      </div>
    </Dialog>
  );
}
