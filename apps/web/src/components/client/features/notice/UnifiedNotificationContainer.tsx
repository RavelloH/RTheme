"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";

import {
  MessageNotificationCard,
  type MessageNotificationItem,
} from "@/components/client/features/notice/MessageNotificationToast";
import {
  NotificationCard,
  type NotificationItem,
} from "@/components/client/features/notice/NotificationToast";
import { useFooterStore } from "@/store/footer-store";

interface UnifiedNotificationContainerProps {
  notifications: NotificationItem[];
  messageNotifications: MessageNotificationItem[];
  onRemoveNotification: (id: string) => void;
  onRemoveMessageNotification: (id: string) => void;
}

/**
 * 统一的通知容器组件
 *
 * 将普通通知和消息通知放在同一个容器中，共享布局动画系统
 */
export default function UnifiedNotificationContainer({
  notifications,
  messageNotifications,
  onRemoveNotification,
  onRemoveMessageNotification,
}: UnifiedNotificationContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const isFooterVisible = useFooterStore((state) => state.isFooterVisible);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 当有任何通知时立即显示，当没有通知时延迟隐藏（等待动画完成）
  useEffect(() => {
    const hasAnyNotification =
      notifications.length > 0 || messageNotifications.length > 0;

    if (hasAnyNotification) {
      setShouldRender(true);
    } else {
      // 延迟 500ms 隐藏容器，让退出动画有时间播放
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [notifications.length, messageNotifications.length]);

  if (!mounted || !shouldRender) {
    return null;
  }

  // Footer 高度为 5em (80px)
  const bottomOffset = isFooterVisible ? "calc(5em + 1rem)" : "1rem";

  const toastContent = (
    <div
      className="fixed left-4 z-[10] flex max-h-screen flex-col-reverse gap-2 pointer-events-none transition-all duration-300"
      style={{
        bottom: bottomOffset,
        width: "380px",
      }}
    >
      <AnimatePresence mode="sync">
        {/* 普通通知在下方 */}
        {notifications.map((notification) => (
          <NotificationCard
            key={notification.id}
            notification={notification}
            onRemove={onRemoveNotification}
          />
        ))}

        {/* 消息通知在上方（Telegram 风格分组） */}
        {messageNotifications.map((notification, index) => {
          // 检查前一个消息是否来自同一个发送人
          // 如果前一个不是同一人，则当前消息是新组的第一条，显示头像
          const prevNotification = messageNotifications[index - 1];
          const showAvatar =
            !prevNotification ||
            prevNotification.sender.uid !== notification.sender.uid;

          // 检查后一个消息是否来自同一个发送人
          // 如果后一个不是同一人，则当前消息是组的最后一条，显示昵称
          const nextNotification = messageNotifications[index + 1];
          const showSenderName =
            !nextNotification ||
            nextNotification.sender.uid !== notification.sender.uid;

          return (
            <MessageNotificationCard
              key={notification.id}
              notification={notification}
              onRemove={onRemoveMessageNotification}
              showSenderName={showSenderName}
              showAvatar={showAvatar}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );

  return createPortal(toastContent, document.body);
}
