"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RiCloseLine } from "@remixicon/react";
import { useFooterStore } from "@/store/footer-store";
import { useNavigateWithTransition } from "./Link";
import Clickable from "@/ui/Clickable";
import UserAvatar from "./UserAvatar";
import { AutoResizer } from "@/ui/AutoResizer";

/**
 * 消息通知项数据接口
 */
export interface MessageNotificationItem {
  id: string;
  conversationId: string;
  sender: {
    uid: number;
    username: string;
    nickname: string | null;
    avatar?: string | null;
    emailMd5?: string | null;
  };
  messageContent: string;
  createdAt: string;
}

interface MessageNotificationToastProps {
  notifications: MessageNotificationItem[];
  onRemove: (id: string) => void;
}

/**
 * 单个消息通知卡片组件（导出供统一容器使用）
 */
export interface MessageNotificationCardProps {
  notification: MessageNotificationItem;
  onRemove: (id: string) => void;
  showSenderName?: boolean; // 是否显示发送者昵称（Telegram 风格分组）
  showAvatar?: boolean; // 是否显示头像（Telegram 风格分组）
}

export function MessageNotificationCard({
  notification,
  onRemove,
  showSenderName = true,
  showAvatar = true,
}: MessageNotificationCardProps) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const createTimeRef = useRef<number>(Date.now());
  const pauseTimeRef = useRef<number>(0);
  const totalPausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const navigate = useNavigateWithTransition();

  const DURATION = 60000;

  const senderName =
    notification.sender.nickname || notification.sender.username;

  // 处理点击：跳转到对话
  const handleClick = () => {
    navigate(`/messages?conversation=${notification.conversationId}`);
    onRemove(notification.id);
  };

  // 进度条动画
  useEffect(() => {
    const updateProgress = () => {
      if (isPaused) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
        return;
      }

      const now = Date.now();
      const elapsed = now - createTimeRef.current - totalPausedTimeRef.current;
      const remaining = Math.max(0, DURATION - elapsed);
      const newProgress = (remaining / DURATION) * 100;

      setProgress(newProgress);

      if (remaining <= 0) {
        onRemove(notification.id);
      } else {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, notification.id, onRemove]);

  // Hover 时暂停进度
  const handleMouseEnter = () => {
    pauseTimeRef.current = Date.now();
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    const pausedDuration = Date.now() - pauseTimeRef.current;
    totalPausedTimeRef.current += pausedDuration;
    setIsPaused(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        x: -20,
        scale: 0.95,
      }}
      transition={{
        type: "spring",
        damping: 25,
        stiffness: 400,
        mass: 0.8,
      }}
      className="pointer-events-auto flex items-end gap-3 cursor-pointer group w-fit"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 用户头像（Telegram 风格：只有最后一个消息显示，其余透明） */}
      <div className="flex-shrink-0 contents">
        <UserAvatar
          username={notification.sender.username}
          avatarUrl={notification.sender.avatar}
          emailMd5={notification.sender.emailMd5}
          size={40}
          shape="circle"
          className={`${showAvatar ? "opacity-100" : "opacity-0"}`}
        />
      </div>

      {/* 消息气泡区域 */}
      <div className="flex-1 flex flex-col gap-1 items-start">
        {/* 消息气泡容器（带进度条） */}
        <div className="relative">
          {/* 消息气泡 */}
          <div
            className={`relative px-4 py-2 break-words rounded-sm bg-background border border-border text-foreground overflow-hidden shadow-md hover:shadow-lg transition-shadow ${showAvatar && "rounded-bl-none"}`}
          >
            {/* 背景进度条 */}
            <motion.div
              className="absolute inset-0 bg-primary/10 pointer-events-none"
              initial={{ width: "100%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1, ease: "linear" }}
              style={{ transformOrigin: "left" }}
            />

            {/* 消息内容 */}
            <div className="text-sm whitespace-pre-wrap relative z-[1]">
              {/* 发送者名称 */}
              <AutoResizer>
                {showSenderName && (
                  <div className="text-xs text-primary mb-1">{senderName}</div>
                )}
              </AutoResizer>
              {notification.messageContent}
            </div>
          </div>

          {/* Telegram 风格的尾巴（双层结构） */}
          {showAvatar && (
            <div className="absolute bottom-0 -left-[0.5em]">
              <svg
                width="8"
                height="12"
                viewBox="0 0 8 12"
                className="scale-x-[-1]"
              >
                {/* 底层：背景色 + 边框 */}
                <path d="M 0 0 L 8 12 L 0 12 Z" className="fill-background" />
                {/* 上层：进度条颜色（在进度条范围内显示） */}
                <motion.path
                  d="M 0 0 L 8 12 L 0 12 Z"
                  className="fill-primary/10"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: progress > 0 ? 1 : 0 }}
                  transition={{ duration: 0.1 }}
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* 关闭按钮 */}
      <Clickable
        onClick={(e) => {
          e.stopPropagation();
          onRemove(notification.id);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground px-1 h-full my-auto"
        aria-label="关闭通知"
      >
        <RiCloseLine size="1.5em" />
      </Clickable>
    </motion.div>
  );
}

/**
 * 消息通知容器组件
 */
export default function MessageNotificationToast({
  notifications,
  onRemove,
}: MessageNotificationToastProps) {
  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const isFooterVisible = useFooterStore((state) => state.isFooterVisible);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 当有通知时立即显示，当没有通知时延迟隐藏（等待动画完成）
  useEffect(() => {
    if (notifications.length > 0) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  if (!mounted || !shouldRender) {
    return null;
  }

  // Footer 高度为 5em (80px)
  // 消息通知在普通通知的物理上方，预留普通通知的空间（约400px）
  const bottomOffset = isFooterVisible
    ? "calc(5em + 1rem + 400px)"
    : "calc(1rem + 400px)";

  const toastContent = (
    <div
      className="fixed left-4 z-[11] flex max-h-screen flex-col-reverse gap-2 pointer-events-none transition-all duration-300"
      style={{
        bottom: bottomOffset,
        width: "380px",
      }}
    >
      <AnimatePresence mode="sync">
        {notifications.map((notification) => (
          <MessageNotificationCard
            key={notification.id}
            notification={notification}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );

  return createPortal(toastContent, document.body);
}
