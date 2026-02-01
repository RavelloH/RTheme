"use client";

import React from "react";
import {
  RiArticleLine,
  RiChat3Line,
  RiEye2Line,
  RiFolderLine,
  RiHeartLine,
  RiPriceTag3Line,
  RiReplyLine,
  RiTimeLine,
} from "@remixicon/react";
import type {
  CommentActivity,
  LikeActivity,
  PostActivity,
  UserActivityItem,
} from "@repo/shared-types/api/user";

import { useNavigateWithTransition } from "@/components/ui/Link";
import Link from "@/components/ui/Link";
import { formatRelativeTime } from "@/lib/shared/relative-time";
import { Tooltip } from "@/ui/Tooltip";

interface ActivityCardProps {
  activity: UserActivityItem;
  onNavigate?: (path: string) => void; // 自定义导航函数
}

export default function ActivityCard({
  activity,
  onNavigate,
}: ActivityCardProps) {
  const navigate = useNavigateWithTransition();

  const handleClick = () => {
    let targetPath: string | undefined;

    if (activity.type === "post") {
      targetPath = `/posts/${activity.post.slug}`;
    } else if (activity.type === "comment") {
      targetPath = `/posts/${activity.comment.postSlug}`;
    } else if (activity.type === "like") {
      targetPath = `/posts/${activity.like.postSlug}`;
    }

    if (targetPath) {
      if (onNavigate) {
        onNavigate(targetPath);
      } else {
        navigate(targetPath);
      }
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group relative px-6 py-4 border-b border-foreground/10 transition-all duration-200 cursor-pointer hover:bg-foreground/5"
    >
      {activity.type === "post" && <PostActivityCard activity={activity} />}
      {activity.type === "comment" && (
        <CommentActivityCard activity={activity} />
      )}
      {activity.type === "like" && <LikeActivityCard activity={activity} />}
    </div>
  );
}

/**
 * 文章活动卡片
 */
function PostActivityCard({ activity }: { activity: PostActivity }) {
  return (
    <div className="flex flex-col gap-3">
      {/* 操作标题 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RiArticleLine size="1em" className="text-primary" />
        <span>发表了文章：</span>
      </div>

      {/* 文章卡片 */}
      <div className="pl-6 border-l-2 border-primary/30">
        {/* 标题 */}
        <h3 className="text-lg font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
          {activity.post.title}
        </h3>

        {/* 标签和分类 */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {/* 分类 */}
          {activity.post.categories.length > 0 && (
            <div className="flex items-center gap-2">
              <RiFolderLine size="1em" className="text-muted-foreground" />
              <div className="flex flex-wrap gap-1.5">
                {activity.post.categories.map((category) => (
                  <Link
                    key={category.slug}
                    href={`/categories/${category.slug}`}
                    className="py-0.5 text-xs transition-colors text-muted-foreground hover:text-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 标签 */}
          {activity.post.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <RiPriceTag3Line size="1em" className="text-muted-foreground" />
              <div className="flex flex-wrap gap-1.5">
                {activity.post.tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={`/tags/${tag.slug}`}
                    className="py-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 元信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Tooltip
            content={new Date(activity.createdAt).toLocaleString()}
            className="flex items-center gap-1"
          >
            <RiTimeLine size="1em" />
            <span>{formatRelativeTime(activity.createdAt)}</span>
          </Tooltip>
          {/* 浏览数（由 ViewCountBatchLoader 填充） */}
          <span
            className="flex items-center gap-1 opacity-0 transition-all"
            data-viewcount-slug={activity.post.slug}
          >
            <RiEye2Line size="1em" />
            <span>---</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * 评论活动卡片
 */
function CommentActivityCard({ activity }: { activity: CommentActivity }) {
  const isReply = !!activity.comment.parentComment;

  return (
    <div className="flex flex-col gap-3">
      {/* 操作标题 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isReply ? (
          <>
            <RiReplyLine size="1em" className="text-primary" />
            <span>回复了评论：</span>
          </>
        ) : (
          <>
            <RiChat3Line size="1em" className="text-primary" />
            <span>评论了文章：</span>
          </>
        )}
      </div>

      {/* 评论卡片 */}
      <div className="pl-6 border-l-2 border-primary/30">
        {/* 如果是回复，显示父评论 */}
        {isReply && activity.comment.parentComment && (
          <div className="mb-3 p-3 bg-foreground/5 rounded-sm border border-foreground/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-muted-foreground">
                @{activity.comment.parentComment.authorUsername}：
              </span>
            </div>
            <p
              className="text-sm text-muted-foreground line-clamp-3"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {activity.comment.parentComment.content}
            </p>
          </div>
        )}

        {/* 评论内容 */}
        <p
          className="text-sm text-foreground mb-3 line-clamp-3"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {activity.comment.content}
        </p>

        {/* 所属文章 */}
        <div className="text-xs text-muted-foreground mb-2">
          来自文章《
          <span className="text-foreground">{activity.comment.postTitle}</span>
          》
        </div>

        {/* 元信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Tooltip
            content={new Date(activity.createdAt).toLocaleString()}
            className="flex items-center gap-1"
          >
            <RiTimeLine size="1em" />
            <span>{formatRelativeTime(activity.createdAt)}</span>
          </Tooltip>
          <div className="flex items-center gap-1">
            <RiHeartLine size="1em" />
            <span>{activity.comment.likesCount} 赞</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 点赞活动卡片
 */
function LikeActivityCard({ activity }: { activity: LikeActivity }) {
  return (
    <div className="flex flex-col gap-3">
      {/* 操作标题 */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <RiHeartLine size="1em" className="text-primary" />
        <span>点赞了评论：</span>
      </div>

      {/* 点赞卡片 */}
      <div className="pl-6 border-l-2 border-primary/30">
        {/* 被点赞的评论内容 */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-muted-foreground">
              @{activity.like.commentAuthorUsername}：
            </span>
          </div>
          <p
            className="text-sm text-foreground line-clamp-3"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {activity.like.commentContent}
          </p>
        </div>

        {/* 所属文章 */}
        <div className="text-xs text-muted-foreground mb-2">
          来自文章《
          <span className="text-foreground">{activity.like.postTitle}</span>》
        </div>

        {/* 元信息 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Tooltip
            content={new Date(activity.createdAt).toLocaleString()}
            className="flex items-center gap-1"
          >
            <RiTimeLine size="1em" />
            <span>{formatRelativeTime(activity.createdAt)}</span>
          </Tooltip>
          <div className="flex items-center gap-1">
            <RiHeartLine size="1em" />
            <span>{activity.like.commentLikesCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
