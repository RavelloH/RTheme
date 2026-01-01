"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import {
  RiNotification3Line,
  RiCheckDoubleLine,
  RiTimeLine,
  RiZzzLine,
  RiMailLine,
  RiMailOpenLine,
} from "@remixicon/react";
import { Button } from "@/ui/Button";
import { useToast } from "@/ui/Toast";
import {
  markNoticesAsRead,
  markAllNoticesAsRead,
  getReadNotices,
} from "@/actions/notice";
import { useNavigateWithTransition } from "@/components/Link";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { useBroadcastSender } from "@/hooks/use-broadcast";

interface Notice {
  id: string;
  title: string; // 通知标题
  content: string; // 通知正文
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

interface UnreadNoticeUpdateMessage {
  type: "unread_notice_update";
  count: number;
}

interface CachedNoticeCount {
  count: number;
  cachedAt: number;
}

interface NotificationsClientProps {
  unreadNotices: Notice[];
  readNotices: Notice[];
  totalReadCount: number; // 已读通知总数
  isModal?: boolean;
  onRequestClose?: (targetPath?: string) => void; // 请求关闭模态框的回调
  hasMoreRead?: boolean; // 是否有更多已读通知
}

export default function NotificationsClient({
  unreadNotices: initialUnread,
  readNotices: initialRead,
  totalReadCount: initialTotalReadCount,
  isModal = false,
  onRequestClose,
  hasMoreRead: initialHasMoreRead = false,
}: NotificationsClientProps) {
  const navigate = useNavigateWithTransition();
  const toast = useToast();
  const { broadcast } = useBroadcastSender<UnreadNoticeUpdateMessage>();
  const [isPending, startTransition] = useTransition();
  const [unreadNotices, setUnreadNotices] = useState(initialUnread);
  const [readNotices, setReadNotices] = useState(initialRead);
  const [totalReadCount, setTotalReadCount] = useState(initialTotalReadCount);
  const [hasMoreRead, setHasMoreRead] = useState(initialHasMoreRead);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const modalScrollRef = useRef<HTMLDivElement>(null); // 模态框滚动容器
  const loadingRef = useRef(false);

  // 更新未读数到 localStorage 并广播
  const updateUnreadCount = (count: number) => {
    const data: CachedNoticeCount = {
      count,
      cachedAt: Date.now(),
    };
    localStorage.setItem("unread_notice_count", JSON.stringify(data));
    broadcast({ type: "unread_notice_update", count });
  };

  // 加载更多已读通知
  const loadMoreReadNotices = async () => {
    if (loadingRef.current || !hasMoreRead) return;

    loadingRef.current = true;
    setIsLoadingMore(true);

    try {
      const result = await getReadNotices(readNotices.length, 10);
      if (result.success && result.data) {
        setReadNotices((prev) => [...prev, ...result.data!.read]);
        setHasMoreRead(result.data.hasMoreRead || false);
      } else {
        toast.error(result.message || "加载失败");
      }
    } catch (error) {
      console.error("加载更多通知失败:", error);
      toast.error("加载失败");
    } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  };

  // 滚动监听（宽屏模式监听 window，模态框模式监听容器）
  useEffect(() => {
    if (isModal) {
      // 模态框模式：监听容器滚动
      const container = modalScrollRef.current;
      if (!container) return;

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight - scrollTop - clientHeight < 200 && hasMoreRead) {
          loadMoreReadNotices();
        }
      };

      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    } else {
      // 宽屏模式：监听 window 滚动
      const handleScroll = () => {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;

        if (scrollHeight - scrollTop - clientHeight < 200 && hasMoreRead) {
          loadMoreReadNotices();
        }
      };

      window.addEventListener("scroll", handleScroll);
      return () => window.removeEventListener("scroll", handleScroll);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreRead, readNotices.length, isModal]);

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
          setUnreadNotices((prev) => {
            const newUnread = prev.filter((n) => n.id !== notice.id);
            // 同步未读数到 localStorage 并广播
            updateUnreadCount(newUnread.length);
            return newUnread;
          });
          setReadNotices((prev) => [notice, ...prev]);
          setTotalReadCount((prev) => prev + 1); // 已读总数 +1

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

    const unreadCount = unreadNotices.length;
    startTransition(async () => {
      const result = await markAllNoticesAsRead();
      if (result.success) {
        // 将所有未读通知移到已读列表
        setReadNotices((prev) => [...unreadNotices, ...prev]);
        setUnreadNotices([]);
        setTotalReadCount((prev) => prev + unreadCount); // 已读总数增加
        // 同步未读数到 localStorage 并广播
        updateUnreadCount(0);
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
        <div className="flex gap-4">
          {/* 内容区域 */}
          <div className="flex-1 min-w-0">
            {/* 标题行：未读小点 + 标题 */}
            <div className="flex items-center gap-2.5 mb-1">
              {/* 未读标识 */}
              {!isRead && (
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                </div>
              )}

              {/* 标题：加大字号、粗体 */}
              <p
                className={`text-base font-semibold leading-relaxed flex-1 min-w-0 ${
                  isRead ? "text-muted-foreground" : "text-foreground"
                }`}
              >
                {notice.title}
              </p>
            </div>

            {/* 正文：普通样式 */}
            {notice.content && (
              <p
                className={`text-sm leading-relaxed ${
                  isRead ? "text-muted-foreground/80" : "text-foreground/80"
                }`}
              >
                {notice.content.replace(/\n/g, " ")}
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
    <div className="bg-background">
      {!isModal ? (
        // 宽屏模式
        <div className="max-w-5xl mx-auto px-4 py-8 pb-20">
          {/* 头部 */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="mb-2">
                <div className="flex items-center gap-3">
                  <RiNotification3Line size="1.75em" className="text-primary" />
                  <h1 className="text-3xl font-bold text-foreground tracking-wider">
                    通知中心
                  </h1>
                </div>
              </div>
              <p className="text-muted-foreground">
                {unreadNotices.length} 条未读 · 共{" "}
                {unreadNotices.length + totalReadCount} 条通知
              </p>
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

          {/* 通知列表容器 */}
          <div className="bg-background border border-foreground/10 rounded-sm overflow-hidden">
            <div>
              <AutoTransition type="fade" duration={0.2} initial={false}>
                {unreadNotices.length === 0 && readNotices.length === 0 ? (
                  <div
                    key="empty"
                    className="flex flex-col items-center justify-center text-muted-foreground py-20"
                  >
                    <RiZzzLine size="3em" className="mb-4" />
                    <p className="text-sm">暂无通知</p>
                  </div>
                ) : (
                  <div key="list">
                    {/* 未读通知 */}
                    {unreadNotices.length > 0 && (
                      <div>
                        <div className="sticky top-0 z-10 px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-foreground/10">
                          <div className="flex items-center gap-2">
                            <RiMailLine size="1em" className="text-primary" />
                            <h3 className="text-sm font-semibold text-foreground">
                              未读通知
                            </h3>
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                              {unreadNotices.length}
                            </span>
                          </div>
                        </div>
                        {unreadNotices.map((notice) =>
                          renderNoticeItem(notice, false),
                        )}
                      </div>
                    )}

                    {/* 已读通知 */}
                    {readNotices.length > 0 && (
                      <div className={unreadNotices.length > 0 ? "mt-6" : ""}>
                        <div className="sticky top-0 z-10 px-6 py-3 bg-background/95 backdrop-blur-sm border-b border-foreground/10">
                          <div className="flex items-center gap-2">
                            <RiMailOpenLine
                              size="1em"
                              className="text-muted-foreground"
                            />
                            <h3 className="text-sm font-semibold text-foreground">
                              已读通知
                            </h3>
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-foreground/5 text-muted-foreground rounded-full">
                              {totalReadCount}
                            </span>
                          </div>
                        </div>
                        {readNotices.map((notice) =>
                          renderNoticeItem(notice, true),
                        )}

                        {/* 加载更多指示器 */}
                        {isLoadingMore && (
                          <div className="flex items-center justify-center py-8">
                            <LoadingIndicator size="md" />
                          </div>
                        )}

                        {/* 没有更多提示 */}
                        {!hasMoreRead && readNotices.length > 0 && (
                          <div className="flex items-center justify-center py-8">
                            <p className="text-sm text-muted-foreground">
                              没有更多通知了
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </AutoTransition>
            </div>
          </div>
        </div>
      ) : (
        // 模态框模式
        <div className="flex flex-col h-full bg-background">
          {/* 头部 */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-foreground/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <RiNotification3Line size="1.5em" className="text-primary" />
                <div>
                  <p className="text-sm mt-0.5">
                    {unreadNotices.length} 条未读 · 共{" "}
                    {unreadNotices.length + totalReadCount} 条通知
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
          <div ref={modalScrollRef} className="flex-1 overflow-y-auto">
            <div>
              <AutoTransition type="fade" duration={0.2} initial={false}>
                {unreadNotices.length === 0 && readNotices.length === 0 ? (
                  <div
                    key="empty"
                    className="flex flex-col items-center justify-center h-full text-muted-foreground py-20"
                  >
                    <RiZzzLine size="3em" className="mb-4" />
                    <p className="text-sm">暂无通知</p>
                  </div>
                ) : (
                  <div key="list">
                    {/* 未读通知 */}
                    {unreadNotices.length > 0 && (
                      <div>
                        <div className="sticky top-0 z-10 px-6 py-3 bg-background/80 backdrop-blur-sm border-b border-foreground/10">
                          <div className="flex items-center gap-2">
                            <RiMailLine size="1em" className="text-primary" />
                            <h3 className="text-sm font-semibold text-foreground">
                              未读通知
                            </h3>
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                              {unreadNotices.length}
                            </span>
                          </div>
                        </div>
                        {unreadNotices.map((notice) =>
                          renderNoticeItem(notice, false),
                        )}
                      </div>
                    )}

                    {/* 已读通知 */}
                    {readNotices.length > 0 && (
                      <div className={unreadNotices.length > 0 ? "mt-6" : ""}>
                        <div className="sticky top-0 z-10 px-6 py-3 bg-background/80 backdrop-blur-sm border-b border-foreground/10">
                          <div className="flex items-center gap-2">
                            <RiMailOpenLine
                              size="1em"
                              className="text-muted-foreground"
                            />
                            <h3 className="text-sm font-semibold text-foreground">
                              已读通知
                            </h3>
                            <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-foreground/5 text-muted-foreground rounded-full">
                              {totalReadCount}
                            </span>
                          </div>
                        </div>
                        {readNotices.map((notice) =>
                          renderNoticeItem(notice, true),
                        )}

                        {/* 加载更多指示器 */}
                        {isLoadingMore && (
                          <div className="flex items-center justify-center py-8">
                            <LoadingIndicator size="md" />
                          </div>
                        )}

                        {/* 没有更多提示 */}
                        {!hasMoreRead && readNotices.length > 0 && (
                          <div className="flex items-center justify-center py-8">
                            <p className="text-sm text-muted-foreground">
                              没有更多通知了
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </AutoTransition>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
