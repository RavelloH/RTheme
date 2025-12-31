"use client";

import React, { useState, useTransition } from "react";
import {
  RiNotification3Line,
  RiCheckDoubleLine,
  RiTimeLine,
  RiZzzLine,
} from "@remixicon/react";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import { markNoticesAsRead, markAllNoticesAsRead } from "@/actions/notice";
import { useNavigateWithTransition } from "@/components/Link";

interface Notice {
  id: string;
  title: string; // 通知标题
  content: string; // 通知正文
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationsClientProps {
  unreadNotices: Notice[];
  readNotices: Notice[];
  isModal?: boolean;
  onRequestClose?: (targetPath?: string) => void; // 请求关闭模态框的回调
}

export default function NotificationsClient({
  unreadNotices: initialUnread,
  readNotices: initialRead,
  isModal = false,
  onRequestClose,
}: NotificationsClientProps) {
  const navigate = useNavigateWithTransition();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [unreadNotices, setUnreadNotices] = useState(initialUnread);
  const [readNotices, setReadNotices] = useState(initialRead);

  // 处理点击通知
  const handleNoticeClick = async (notice: Notice) => {
    // 如果已读，直接跳转
    if (notice.isRead && notice.link) {
      if (isModal && onRequestClose) {
        // 模态框模式：调用关闭回调，由外部控制动画和跳转
        onRequestClose(notice.link);
      } else {
        navigate(notice.link);
      }
      return;
    }

    // 未读通知，先标记为已读
    if (!notice.isRead) {
      startTransition(async () => {
        const result = await markNoticesAsRead([notice.id]);
        if (result.success) {
          // 更新本地状态
          setUnreadNotices((prev) => prev.filter((n) => n.id !== notice.id));
          setReadNotices((prev) => [notice, ...prev]);

          // 如果有链接，跳转
          if (notice.link) {
            if (isModal && onRequestClose) {
              // 模态框模式：调用关闭回调，由外部控制动画和跳转
              onRequestClose(notice.link);
            } else {
              navigate(notice.link);
            }
          }
        } else {
          toast.error(result.message || "标记失败");
        }
      });
    }
  };

  // 处理全部标记为已读
  const handleMarkAllAsRead = () => {
    if (unreadNotices.length === 0) {
      toast.info("没有未读通知");
      return;
    }

    startTransition(async () => {
      const result = await markAllNoticesAsRead();
      if (result.success) {
        // 将所有未读通知移到已读列表
        setReadNotices((prev) => [...unreadNotices, ...prev]);
        setUnreadNotices([]);
        toast.success(result.message || "已全部标记为已读");
      } else {
        toast.error(result.message || "操作失败");
      }
    });
  };

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(date).toLocaleDateString("zh-CN");
    }
    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小时前`;
    if (minutes > 0) return `${minutes} 分钟前`;
    return "刚刚";
  };

  // 渲染通知项
  const renderNoticeItem = (notice: Notice, isRead: boolean) => {
    return (
      <div
        key={notice.id}
        onClick={() => handleNoticeClick(notice)}
        className={`
        group relative px-6 py-4 border-b border-foreground/10
        transition-all duration-200
        ${notice.link ? "cursor-pointer hover:bg-foreground/5" : ""}
        ${!isRead ? "bg-primary/5" : ""}
      `}
      >
        <div className="flex items-start gap-4">
          {/* 未读标识 */}
          {!isRead && (
            <div className="flex-shrink-0 mt-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          )}

          {/* 内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 标题：加大字号、粗体 */}
            <p
              className={`text-base font-semibold leading-relaxed mb-1 ${
                isRead ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {notice.title}
            </p>

            {/* 正文：普通样式 */}
            {notice.content && (
              <p
                className={`text-sm leading-relaxed whitespace-pre-line ${
                  isRead ? "text-muted-foreground/80" : "text-foreground/80"
                }`}
              >
                {notice.content}
              </p>
            )}

            {/* 时间 */}
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <RiTimeLine size={14} />
              <span>{formatTime(notice.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`flex flex-col h-full bg-background ${
        !isModal ? "max-w-4xl mx-auto" : ""
      }`}
    >
      {/* 头部 */}
      <div
        className={`flex-shrink-0 px-6 py-4 border-b border-foreground/10 ${
          !isModal ? "pt-8" : ""
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <RiNotification3Line size="1.5em" className="text-primary" />
            <div>
              <h2 className="text-xl font-medium text-foreground">通知中心</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {unreadNotices.length} 条未读 · 共{" "}
                {unreadNotices.length + readNotices.length} 条
              </p>
            </div>
          </div>

          {unreadNotices.length > 0 && (
            <Button
              label="全部已读"
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={isPending}
              loading={isPending}
              icon={<RiCheckDoubleLine size={18} />}
              iconPosition="left"
            />
          )}
        </div>
      </div>

      {/* 通知列表 */}
      <div className={`flex-1 overflow-y-auto ${!isModal ? "pb-8" : ""}`}>
        {unreadNotices.length === 0 && readNotices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-20">
            <RiZzzLine size="3em" className="mb-4" />
            <p className="text-sm">暂无通知</p>
          </div>
        ) : (
          <>
            {/* 未读通知 */}
            {unreadNotices.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 px-6 py-2 bg-background/80 backdrop-blur-sm border-b border-foreground/10">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    未读通知 ({unreadNotices.length})
                  </h3>
                </div>
                {unreadNotices.map((notice) => renderNoticeItem(notice, false))}
              </div>
            )}

            {/* 已读通知 */}
            {readNotices.length > 0 && (
              <div className={unreadNotices.length > 0 ? "mt-6" : ""}>
                <div className="sticky top-0 z-10 px-6 py-2 bg-background/80 backdrop-blur-sm border-b border-foreground/10">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    已读通知 ({readNotices.length})
                  </h3>
                </div>
                {readNotices.map((notice) => renderNoticeItem(notice, true))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
