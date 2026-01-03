"use client";

import React from "react";
import {
  RiArticleLine,
  RiChat3Line,
  RiHeartLine,
  RiHeartFill,
  RiMailLine,
  RiSettings4Line,
  RiTimeLine,
  RiGlobalLine,
  RiUserSettingsLine,
} from "@remixicon/react";
import type {
  UserProfile,
  UserActivityItem,
} from "@repo/shared-types/api/user";
import { Button } from "@/ui/Button";
import Link, { useNavigateWithTransition } from "@/components/Link";
import UserAvatar from "@/components/UserAvatar";
import UserActivityTimeline from "./UserActivityTimeline";
import { formatRelativeTime } from "@/lib/shared/relative-time";
import { Tooltip } from "@/ui/Tooltip";

interface UserProfileClientProps {
  profile: UserProfile;
  initialActivities: UserActivityItem[];
  hasMore: boolean;
  isGuest: boolean;
  isModal?: boolean; // 是否在模态框中显示
  onRequestClose?: (targetPath?: string) => void; // 请求关闭模态框的回调
}

export default function UserProfileClient({
  profile,
  initialActivities,
  hasMore,
  isGuest,
  isModal = false,
  onRequestClose,
}: UserProfileClientProps) {
  const navigate = useNavigateWithTransition();

  const { user, stats, onlineStatus, permissions } = profile;

  // 处理导航：模态框模式下先关闭再跳转
  const handleNavigate = (path: string) => {
    if (isModal && onRequestClose) {
      onRequestClose(path);
    } else {
      navigate(path);
    }
  };

  // 在线状态颜色
  const onlineStatusColor = {
    online: "text-success",
    recently_online: "text-warning",
    offline: "text-muted-foreground",
  }[onlineStatus.status];

  // 在线状态图标组件
  const OnlineStatusIcon = () => {
    switch (onlineStatus.status) {
      case "online":
        // Ably 检测到在线 - 带波纹动画
        return (
          <div className="relative w-3 h-3 flex items-center justify-center flex-shrink-0">
            <span
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-success opacity-75 animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-success" />
          </div>
        );
      case "recently_online":
        // 最近在线 - 黄色静态圆点
        return (
          <div className="relative w-3 h-3 flex items-center justify-center flex-shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-warning" />
          </div>
        );
      case "offline":
        // 离线 - 灰色静态圆点
        return (
          <div className="relative w-3 h-3 flex items-center justify-center flex-shrink-0">
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          </div>
        );
    }
  };

  return (
    <div
      className={
        isModal
          ? "h-[calc(90vh-10em)] max-w-6xl mx-auto"
          : "max-w-6xl mx-auto my-4 mb-20 border rounded-sm border-border"
      }
    >
      {/* 田字格布局 */}
      <div
        className={
          isModal
            ? "grid grid-cols-1 lg:grid-cols-[1fr_auto] lg:grid-rows-[200px_1fr] h-full"
            : "flex flex-col lg:grid lg:grid-cols-[1fr_auto] lg:grid-rows-[auto_auto]"
        }
      >
        {/* 区域1：基础信息（左上） */}
        <div className="flex flex-col gap-4 p-6 border-b lg:border-r border-border overflow-hidden">
          {/* 移动端和桌面端布局 */}
          <div className="flex gap-4 lg:flex-col">
            {/* 移动端：左侧头像+Role */}
            {!isModal && (
              <div className="flex flex-col items-center gap-2 flex-shrink-0 lg:hidden">
                <UserAvatar
                  username={user.username}
                  avatarUrl={user.avatar}
                  email={user.email}
                  size={80}
                  shape="circle"
                  className="w-[80px] h-[80px]"
                />
                <div className="flex items-center justify-center py-1 px-3 bg-primary rounded-full">
                  <span className="text-xs font-medium text-primary-foreground">
                    {user.role}
                  </span>
                </div>
              </div>
            )}

            {/* 用户信息 */}
            <div className="flex-1 flex flex-col justify-start gap-2">
              {/* 昵称和用户名 */}
              <div>
                <h1 className="text-xl lg:text-3xl font-bold text-foreground mb-1">
                  {user.nickname || user.username}
                </h1>
                <p className="text-xs lg:text-sm text-muted-foreground flex flex-wrap gap-3 items-center">
                  {user.nickname && (
                    <span className="font-mono">@{user.username}</span>
                  )}
                  {user.nickname && <span>/</span>}
                  <span className="font-mono">UID:{user.uid}</span>
                  <span>/</span>
                  <Tooltip
                    content={new Date(user.createdAt).toLocaleString()}
                    className="inline-flex items-center gap-1"
                  >
                    <RiTimeLine size="1em" />
                    {formatRelativeTime(user.createdAt)}加入
                  </Tooltip>
                  <span>/</span>
                  <span
                    className={`flex items-center gap-1.5 text-xs lg:text-sm ${onlineStatusColor}`}
                  >
                    <OnlineStatusIcon />
                    <span>{onlineStatus.lastActiveText}</span>
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* 简介和网站（全宽） */}
          <div className="flex flex-col gap-2">
            {/* 简介 */}
            <p
              className={`text-sm text-foreground leading-relaxed ${isModal ? "line-clamp-2" : ""}`}
            >
              {user.bio || "未设置简介。"}
            </p>

            {/* 网站 */}
            {user.website && (
              <div className="flex items-center gap-2 text-sm">
                <RiGlobalLine size="1em" className="text-muted-foreground" />
                <Link
                  href={user.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary truncate"
                  presets={["arrow-out", "hover-underline"]}
                >
                  {user.website}
                </Link>
              </div>
            )}
          </div>

          {/* 移动端：操作按钮（横向排列，全宽） */}
          {!isModal && (
            <div className="flex gap-2 lg:hidden">
              {permissions.canEdit && (
                <Button
                  label="编辑"
                  variant="secondary"
                  size="sm"
                  icon={<RiUserSettingsLine size="1.125em" />}
                  iconPosition="left"
                  onClick={() => handleNavigate("/settings")}
                  className="flex-1"
                />
              )}
              {permissions.canMessage && (
                <Button
                  label="私信"
                  variant="primary"
                  size="sm"
                  icon={<RiMailLine size="1.125em" />}
                  iconPosition="left"
                  onClick={() => handleNavigate(`/messages?uid=${user.uid}`)}
                  className="flex-1"
                />
              )}
              {permissions.canManage && (
                <Button
                  label="管理"
                  variant="secondary"
                  size="sm"
                  icon={<RiSettings4Line size="1.125em" />}
                  iconPosition="left"
                  onClick={() => handleNavigate(`/admin/users?uid=${user.uid}`)}
                  className="flex-1"
                />
              )}
            </div>
          )}
        </div>

        {/* 移动端：统计信息（在区域1和区域3之间） */}
        {!isModal && (
          <div className="lg:hidden border-b border-border p-6">
            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <RiArticleLine
                  size="1.125em"
                  className="text-muted-foreground"
                />
                <span className="text-foreground font-medium">
                  {stats.postsCount}
                </span>
                <span className="text-muted-foreground">篇文章</span>
              </div>
              <div className="flex items-center gap-2">
                <RiChat3Line size="1.125em" className="text-muted-foreground" />
                <span className="text-foreground font-medium">
                  {stats.commentsCount}
                </span>
                <span className="text-muted-foreground">条评论</span>
              </div>
              <div className="flex items-center gap-2">
                <RiHeartLine size="1.125em" className="text-muted-foreground" />
                <span className="text-foreground font-medium">
                  {stats.likesGiven}
                </span>
                <span className="text-muted-foreground">点赞</span>
              </div>
              <div className="flex items-center gap-2">
                <RiHeartFill size="1.125em" className="text-primary" />
                <span className="text-foreground font-medium">
                  {stats.likesReceived}
                </span>
                <span className="text-muted-foreground">获赞</span>
              </div>
            </div>
          </div>
        )}

        {/* 区域3：活动时间线（左下）- 可滚动区域 */}
        <div
          className={`lg:row-start-2 lg:col-start-1 flex flex-col ${isModal ? "min-h-0" : ""}`}
        >
          <div className="flex items-center gap-3 my-3 px-6 flex-shrink-0">
            <RiTimeLine size={24} className="text-primary" />
            <h2 className="text-xl font-bold text-foreground">动态</h2>
          </div>

          <div
            className={`bg-background border-t border-r border-foreground/10 ${isModal ? "flex-1 overflow-y-auto" : ""}`}
          >
            <UserActivityTimeline
              uid={user.uid}
              initialActivities={initialActivities}
              hasMore={hasMore}
              isGuest={isGuest}
              onNavigate={handleNavigate}
            />
          </div>
        </div>

        {/* 右侧区域容器（包含区域2和区域4）- 仅桌面端显示 */}
        <div
          className={`hidden lg:flex lg:row-start-1 lg:row-span-2 lg:col-start-2 flex-col ${!isModal ? "lg:sticky lg:top-0 lg:self-start" : ""}`}
        >
          {/* 区域2：头像（右上） */}
          <div className="flex items-center justify-center bg-foreground/5 border border-foreground/10 h-[200px]">
            <UserAvatar
              username={user.username}
              avatarUrl={user.avatar}
              email={user.email}
              size={200}
              shape="square"
              className="w-full h-full"
            />
          </div>

          {/* 区域4：操作按钮和统计（右下） */}
          <div
            className={`flex flex-col gap-4 ${isModal ? "overflow-y-auto" : ""}`}
          >
            {/* 统计信息 */}
            <div className="border-border flex-shrink-0 h-full">
              <div className="flex items-center justify-center gap-3 py-3 px-6 flex-shrink-0 bg-primary">
                <span className="text-xl text-primary-foreground">
                  {user.role}
                </span>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0 p-4 border-b border-border">
                {/* 编辑按钮（自己） */}
                {permissions.canEdit && (
                  <Button
                    label="编辑资料"
                    variant="secondary"
                    size="sm"
                    icon={<RiUserSettingsLine size="1.125em" />}
                    iconPosition="left"
                    onClick={() => handleNavigate("/settings")}
                  />
                )}

                {/* 私信按钮（他人） */}
                {permissions.canMessage && (
                  <Button
                    label="私信"
                    variant="primary"
                    size="sm"
                    icon={<RiMailLine size="1.125em" />}
                    iconPosition="left"
                    onClick={() => handleNavigate(`/messages?uid=${user.uid}`)}
                  />
                )}

                {/* 管理按钮（管理员） */}
                {permissions.canManage && (
                  <Button
                    label="管理"
                    variant="secondary"
                    size="sm"
                    icon={<RiSettings4Line size="1.125em" />}
                    iconPosition="left"
                    onClick={() =>
                      handleNavigate(`/admin/users?uid=${user.uid}`)
                    }
                  />
                )}
              </div>
              <div className="flex flex-col gap-3 text-sm p-6">
                <div className="flex items-center gap-2">
                  <RiArticleLine
                    size="1.125em"
                    className="text-muted-foreground"
                  />
                  <span className="text-foreground font-medium">
                    {stats.postsCount}
                  </span>
                  <span className="text-muted-foreground">篇文章</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiChat3Line
                    size="1.125em"
                    className="text-muted-foreground"
                  />
                  <span className="text-foreground font-medium">
                    {stats.commentsCount}
                  </span>
                  <span className="text-muted-foreground">条评论</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiHeartLine
                    size="1.125em"
                    className="text-muted-foreground"
                  />
                  <span className="text-foreground font-medium">
                    {stats.likesGiven}
                  </span>
                  <span className="text-muted-foreground">点赞</span>
                </div>
                <div className="flex items-center gap-2">
                  <RiHeartFill size="1.125em" className="text-primary" />
                  <span className="text-foreground font-medium">
                    {stats.likesReceived}
                  </span>
                  <span className="text-muted-foreground">获赞</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
