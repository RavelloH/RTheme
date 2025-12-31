"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/ui/Dialog";
import NotificationsClient from "../../notifications/NotificationsClient";

interface NotificationsModalProps {
  unreadNotices: Array<{
    id: string;
    content: string;
    link: string | null;
    isRead: boolean;
    createdAt: Date;
  }>;
  readNotices: Array<{
    id: string;
    content: string;
    link: string | null;
    isRead: boolean;
    createdAt: Date;
  }>;
}

export default function NotificationsModal({
  unreadNotices,
  readNotices,
}: NotificationsModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    // 先关闭 Dialog，播放退出动画
    setIsOpen(false);
    // 等待动画完成后再执行路由跳转（Dialog 的动画时长是 200ms）
    setTimeout(() => {
      router.back();
    }, 200);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title="通知中心"
      size="lg"
      showCloseButton={true}
      dismissable={true}
    >
      <div className="h-[600px]">
        <NotificationsClient
          unreadNotices={unreadNotices}
          readNotices={readNotices}
          isModal={true}
        />
      </div>
    </Dialog>
  );
}
