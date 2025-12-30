"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  createComment,
  getDirectChildren,
  getPostComments,
  likeComment,
  unlikeComment,
  deleteOwnComment,
} from "@/actions/comment";
import type { CommentItem } from "@repo/shared-types/api/comment";
import { Input } from "@/ui/Input";
import { Button } from "@/ui/Button";
import { CaptchaButton } from "@/components/CaptchaButton";
import { useBroadcast, useBroadcastSender } from "@/hooks/use-broadcast";
import { resolveApiResponse } from "@/lib/client/run-with-auth";
import { AutoTransition } from "@/ui/AutoTransition";
import { AutoResizer } from "@/ui/AutoResizer";
import { LoadingIndicator } from "@/ui/LoadingIndicator";
import { Tooltip } from "@/ui/Tooltip";
import { AlertDialog } from "@/ui/AlertDialog";
import ReactMarkdown from "react-markdown";
import UserAvatar from "@/components/UserAvatar";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { useToast } from "@/ui/Toast";
import {
  RiMapPin2Line,
  RiReplyLine,
  RiMarkdownLine,
  RiRefreshLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiCloseLine,
  RiHeartLine,
  RiHeartFill,
  RiQuillPenLine,
  RiSpyLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import Clickable from "@/ui/Clickable";
import { useNavigateWithTransition } from "../Link";

// ============ 类型定义 ============

interface CommentConfig {
  placeholder: string;
  anonymousEnabled: boolean;
  anonymousEmailRequired: boolean;
  anonymousWebsiteEnabled: boolean;
  reviewAll: boolean;
  reviewAnonymous: boolean;
  locateEnabled: boolean;
}

interface CommentsSectionProps {
  slug: string;
  allowComments: boolean;
  authorUid: number;
  commentConfig: CommentConfig;
}

/** 匿名用户本地存储的信息 */
interface AnonymousUserInfo {
  authorName: string;
  authorEmail: string;
  authorWebsite: string;
}

/** 本地待审核评论 */
interface LocalPendingComment {
  localId: string;
  slug: string;
  content: string;
  parentId?: string;
  authorName: string;
  authorEmail?: string;
  authorWebsite?: string;
  createdAt: string;
  replyToAuthorName?: string;
}

/** 子评论分页状态 */
interface ChildPaginationState {
  cursor?: string;
  hasNext: boolean;
  loading: boolean;
  expanded: boolean;
}

// ============ 常量 ============

const ANONYMOUS_USER_KEY = "anonymous_comment_user";
const LOCAL_PENDING_COMMENTS_KEY = "local_pending_comments";

// ============ 工具函数 ============

function formatDate(text: string) {
  return new Date(text).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 按 sortKey 排序合并评论 */
function mergeBySortKey(existing: CommentItem[], incoming: CommentItem[]) {
  const map = new Map(existing.map((c) => [c.id, c] as const));
  incoming.forEach((c) => map.set(c.id, c));
  return Array.from(map.values()).sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey),
  );
}

/** 检查评论是否应该被隐藏（父评论被折叠） */
function isHiddenByCollapse(
  comment: CommentItem,
  collapsedIds: Set<string>,
  commentsMap: Map<string, CommentItem>,
): boolean {
  for (const collapsedId of collapsedIds) {
    const collapsed = commentsMap.get(collapsedId);
    if (collapsed && comment.path.startsWith(collapsed.path + "/")) {
      return true;
    }
  }
  return false;
}

/** 获取父评论 ID */
function getParentId(comment: CommentItem): string | null {
  const parts = comment.path.split("/");
  if (parts.length < 2) return null;
  return parts[parts.length - 2] ?? null;
}

/** 层级颜色映射 */
const levelColors = ["text-primary/80"];

// ============ 单条评论组件 ============

interface SingleCommentProps {
  comment: CommentItem;
  onReply: (comment: CommentItem) => void;
  onToggleCollapse: (commentId: string) => void;
  onExpandChildren: (commentId: string) => void;
  onHighlight: (commentId: string | null) => void;
  onToggleLike: (commentId: string, currentIsLiked: boolean) => void;
  onDelete: (comment: CommentItem) => void;
  childPaginationState?: ChildPaginationState;
  isCollapsed: boolean;
  isHighlighted: boolean;
  isInHoverPath: boolean;
  isCurrentHovered: boolean;
  isDirectParent: boolean;
  authorUid: number;
  navigate: (href: string) => void;
}

function SingleComment({
  comment,
  onReply,
  onToggleCollapse,
  onExpandChildren,
  onHighlight,
  onToggleLike,
  onDelete,
  childPaginationState,
  isCollapsed,
  isHighlighted,
  isInHoverPath,
  isCurrentHovered,
  isDirectParent,
  authorUid,
  navigate,
}: SingleCommentProps) {
  const [isNameHovered, setIsNameHovered] = useState(false);

  const statusBadge =
    comment.mine && comment.status !== "APPROVED"
      ? `(${comment.status === "PENDING" ? "待审核" : "未通过"})`
      : "";

  const indent = comment.depth * 24;

  // 使用服务端返回的所有后代评论数量
  const descendantCount = comment.descendantCount ?? 0;

  // 是否有子评论（使用 replyCount 或 hasMore 标记）
  const hasChildren =
    descendantCount > 0 || comment.replyCount > 0 || comment.hasMore;
  const parentId = getParentId(comment);
  const levelColor = levelColors[comment.depth % levelColors.length];

  // 显示的回复数量（使用所有后代评论数）
  const displayReplyCount = descendantCount || comment.replyCount || 0;

  // 是否需要首次展开（有子评论但尚未展开加载）
  const needsFirstExpand = hasChildren && !childPaginationState?.expanded;
  // 是否正在加载
  const isLoading = childPaginationState?.loading ?? false;

  // 高亮父评论
  const highlightParent = () => {
    if (parentId) {
      onHighlight(parentId);
      // 滚动到父评论
      const el = document.getElementById(`comment-${parentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  return (
    <div
      id={`comment-${comment.id}`}
      className={`py-3 transition-all duration-300 border-r-primary ${
        isHighlighted ? "bg-primary/10 border-r-2 ml-2" : ""
      }`}
      style={{ paddingLeft: indent }}
    >
      <div className="group relative">
        <div className="flex gap-3">
          {/* 头像 */}
          <div
            onClick={
              !comment.author.isAnonymous && comment.author.uid
                ? () => navigate(`/profile/${comment.author.uid}`)
                : undefined
            }
            onMouseEnter={() => {
              if (!comment.author.isAnonymous && comment.author.uid) {
                setIsNameHovered(true);
              }
            }}
            onMouseLeave={() => {
              if (!comment.author.isAnonymous && comment.author.uid) {
                setIsNameHovered(false);
              }
            }}
            className={`flex-shrink-0 ${
              !comment.author.isAnonymous && comment.author.uid
                ? "cursor-pointer"
                : ""
            }`}
          >
            <UserAvatar
              username={comment.author.displayName}
              avatarUrl={comment.author.avatar}
              emailMd5={comment.author.emailMd5}
              size={comment.depth === 0 ? 40 : 32}
              shape="circle"
            />
          </div>

          {/* 内容区 */}
          <div className="flex-1 min-w-0">
            {/* 作者信息行 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <span
                onClick={
                  !comment.author.isAnonymous && comment.author.uid
                    ? () => navigate(`/profile/${comment.author.uid}`)
                    : undefined
                }
                onMouseEnter={() => {
                  if (!comment.author.isAnonymous && comment.author.uid) {
                    setIsNameHovered(true);
                  }
                }}
                onMouseLeave={() => {
                  if (!comment.author.isAnonymous && comment.author.uid) {
                    setIsNameHovered(false);
                  }
                }}
                className={`font-semibold text-foreground flex items-center gap-1.5 ${
                  !comment.author.isAnonymous && comment.author.uid
                    ? "cursor-pointer"
                    : ""
                }`}
              >
                <span
                  className={`relative inline ${!comment.author.isAnonymous && comment.author.uid ? `bg-[linear-gradient(currentColor,currentColor)] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 ease-out ${isNameHovered ? "bg-[length:100%_2px]" : "bg-[length:0%_2px]"}` : ""}`}
                >
                  {comment.author.displayName}
                </span>
                {comment.author.isAnonymous && (
                  <Tooltip content="匿名用户">
                    <RiSpyLine
                      size="1em"
                      className="text-muted-foreground flex-shrink-0"
                    />
                  </Tooltip>
                )}
                {comment.author.uid === authorUid && (
                  <Tooltip content="文章作者">
                    <RiQuillPenLine
                      size="1em"
                      className="text-primary flex-shrink-0"
                    />
                  </Tooltip>
                )}
              </span>
              {comment.replyTo && (
                <span className="text-xs">
                  回复 @{comment.replyTo.authorName}
                </span>
              )}
              <span className="text-xs">{formatDate(comment.createdAt)}</span>
              {statusBadge && (
                <span className="text-xs text-error">{statusBadge}</span>
              )}
              {comment.location && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <RiMapPin2Line size="1em" />
                  {comment.location}
                </span>
              )}
              {/* 层级标签 */}
              {comment.depth > 0 && (
                <span
                  className={`text-xs font-medium transition-all duration-300 ${
                    isCurrentHovered
                      ? `${levelColor} font-bold`
                      : isInHoverPath
                        ? levelColor
                        : "text-muted-foreground/60"
                  }`}
                >
                  L{comment.depth}
                </span>
              )}
              {/* 折叠/展开按钮 - 移到信息行 */}
              {hasChildren && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  {needsFirstExpand ? (
                    // 需要首次展开（有子评论但还没加载过）
                    <Clickable
                      onClick={() => onExpandChildren(comment.id)}
                      hoverScale={1}
                      disabled={isLoading}
                      className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isLoading ? (
                        <LoadingIndicator size="sm" />
                      ) : (
                        <motion.div
                          animate={{ rotate: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                          <RiArrowRightSLine size={14} />
                        </motion.div>
                      )}
                      <AutoTransition>
                        {isLoading
                          ? "加载中..."
                          : `展开 ${displayReplyCount} 条回复`}
                      </AutoTransition>
                    </Clickable>
                  ) : (
                    // 已加载回复 - 根据折叠状态显示展开/折叠
                    <Clickable
                      onClick={() => onToggleCollapse(comment.id)}
                      hoverScale={1}
                      className="flex items-center gap-0.5 text-muted-foreground hover:text-foreground text-xs transition-colors"
                    >
                      <motion.div
                        animate={{ rotate: isCollapsed ? 0 : 90 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <RiArrowRightSLine size={14} />
                      </motion.div>
                      <AutoTransition>
                        {isCollapsed
                          ? `展开 ${displayReplyCount} 条回复`
                          : "折叠"}
                      </AutoTransition>
                    </Clickable>
                  )}
                </>
              )}
              {/* 原回复指示 */}
              <AutoTransition>
                {isDirectParent && (
                  <span className="text-xs text-foreground font-bold animate-pulse flex items-center gap-1">
                    ↳ 原回复
                  </span>
                )}
              </AutoTransition>
            </div>

            {/* 评论内容 */}
            <div className="mt-1 prose prose-sm dark:prose-invert max-w-none break-words md-content mini-md-content">
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} skipHtml>
                {comment.content}
              </ReactMarkdown>
            </div>

            {/* 操作栏 - 简化，持续显示 */}
            <div className="mt-2 flex items-center gap-3 text-xs">
              {/* 点赞按钮 */}
              <Clickable
                onClick={() =>
                  onToggleLike(comment.id, comment.isLiked ?? false)
                }
                className={`flex items-center gap-1 transition-colors duration-300 ${
                  comment.isLiked
                    ? "text-error"
                    : "text-muted-foreground hover:text-error"
                }`}
              >
                <AutoTransition type="scale" duration={0.2} initial={false}>
                  {comment.isLiked ? (
                    <RiHeartFill size="1.25em" key="liked" />
                  ) : (
                    <RiHeartLine size="1.25em" key="unliked" />
                  )}
                </AutoTransition>
                <span className="font-mono">
                  <AutoTransition type="fade" duration={0.2} initial={false}>
                    {comment.likeCount > 0 ? comment.likeCount : "0"}
                  </AutoTransition>
                </span>
              </Clickable>
              {/* 回复按钮 */}
              <Clickable
                onClick={() => onReply(comment)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <RiReplyLine size="1.25em" />
                <span>回复</span>
              </Clickable>
              {/* 删除按钮 - 仅自己的评论显示 */}
              {comment.mine && (
                <Clickable
                  onClick={() => onDelete(comment)}
                  className="flex items-center gap-1 text-muted-foreground hover:text-error transition-colors"
                >
                  <RiDeleteBinLine size="1.25em" />
                  <span>删除</span>
                </Clickable>
              )}
              {/* 高亮原回复按钮 */}
              <AutoTransition type="fade" duration={0.15}>
                {isCurrentHovered && parentId && (
                  <Clickable
                    onClick={highlightParent}
                    hoverScale={1.1}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RiArrowUpLine size={14} />
                    <span>高亮原回复</span>
                  </Clickable>
                )}
              </AutoTransition>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 子评论加载更多按钮组件 ============

interface LoadMoreChildrenButtonProps {
  parentId: string;
  loading: boolean;
  depth: number;
  remainingCount: number;
  onLoadMore: (parentId: string) => void;
}

function LoadMoreChildrenButton({
  parentId,
  loading,
  depth,
  remainingCount,
  onLoadMore,
}: LoadMoreChildrenButtonProps) {
  const indent = (depth + 1) * 24;

  return (
    <div className="py-2" style={{ paddingLeft: indent }}>
      <AutoResizer duration={0.3}>
        <AutoTransition type="fade" duration={0.2}>
          {loading ? (
            <div
              key="loading"
              className="flex items-center gap-2 py-4 text-sm text-muted-foreground w-full h-24 justify-center"
            >
              <LoadingIndicator />
            </div>
          ) : (
            <Clickable
              key="button"
              onClick={() => onLoadMore(parentId)}
              hoverScale={1}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <motion.div
                animate={{ rotate: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
              >
                <RiArrowRightSLine size={14} />
              </motion.div>
              <span>展开剩余 {remainingCount} 条回复</span>
            </Clickable>
          )}
        </AutoTransition>
      </AutoResizer>
    </div>
  );
}

// ============ 主组件 ============

export default function CommentsSection({
  slug,
  allowComments,
  authorUid,
  commentConfig,
}: CommentsSectionProps) {
  // 评论数据
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  // 折叠状态
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // 子评论分页状态 Map: parentId -> ChildPaginationState
  // parentId = "root" 表示主级评论
  const [childPaginationMap, setChildPaginationMap] = useState<
    Map<string, ChildPaginationState>
  >(new Map());

  // 高亮状态
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string[]>([]);

  // 回复表单状态
  const [replyTarget, setReplyTarget] = useState<CommentItem | null>(null);
  const [content, setContent] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [authorWebsite, setAuthorWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaLoaded, setCaptchaLoaded] = useState(false);

  // 本地待审核评论
  const [localPendingComments, setLocalPendingComments] = useState<
    LocalPendingComment[]
  >([]);

  // 删除确认对话框状态
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<CommentItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // 预览状态
  const [showPreview, setShowPreview] = useState(false);

  // 懒加载
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement | null>(null);
  const loadingIndicatorRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);

  const { success: toastSuccess, error: toastError } = useToast();
  const { broadcast } = useBroadcastSender<object>();
  const navigate = useNavigateWithTransition();

  // 评论 Map，便于快速查找
  const commentsMap = useMemo(
    () => new Map(comments.map((c) => [c.id, c])),
    [comments],
  );

  // 判断当前用户是否匿名
  const isAnonymous = useMemo(() => {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return true;
    }
    const info = localStorage.getItem("user_info");
    if (!info) return true;
    try {
      const parsed = JSON.parse(info) as { uid?: number };
      return !parsed?.uid;
    } catch {
      return true;
    }
  }, []);

  // 从 localStorage 恢复匿名用户信息
  useEffect(() => {
    if (typeof window === "undefined" || !isAnonymous) return;

    try {
      const saved = localStorage.getItem(ANONYMOUS_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AnonymousUserInfo;
        if (parsed.authorName) setAuthorName(parsed.authorName);
        if (parsed.authorEmail) setAuthorEmail(parsed.authorEmail);
        if (parsed.authorWebsite) setAuthorWebsite(parsed.authorWebsite);
      }
    } catch (e) {
      console.error("恢复匿名用户信息失败", e);
    }
  }, [isAnonymous]);

  // 从 localStorage 恢复本地待审核评论
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(LOCAL_PENDING_COMMENTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as LocalPendingComment[];
        // 只保留当前文章的待审核评论
        const currentSlugComments = parsed.filter((c) => c.slug === slug);
        setLocalPendingComments(currentSlugComments);
      }
    } catch (e) {
      console.error("恢复本地待审核评论失败", e);
    }
  }, [slug]);

  // 保存匿名用户信息到 localStorage
  const saveAnonymousUserInfo = useCallback(() => {
    if (typeof window === "undefined" || !isAnonymous) return;

    const info: AnonymousUserInfo = {
      authorName,
      authorEmail,
      authorWebsite,
    };
    try {
      localStorage.setItem(ANONYMOUS_USER_KEY, JSON.stringify(info));
    } catch (e) {
      console.error("保存匿名用户信息失败", e);
    }
  }, [isAnonymous, authorName, authorEmail, authorWebsite]);

  // 保存本地待审核评论
  const saveLocalPendingComment = useCallback(
    (comment: LocalPendingComment) => {
      if (typeof window === "undefined") return;

      try {
        const saved = localStorage.getItem(LOCAL_PENDING_COMMENTS_KEY);
        const existing: LocalPendingComment[] = saved ? JSON.parse(saved) : [];
        // 添加新评论
        existing.push(comment);
        // 最多保存 50 条，清理最旧的
        const trimmed = existing.slice(-50);
        localStorage.setItem(
          LOCAL_PENDING_COMMENTS_KEY,
          JSON.stringify(trimmed),
        );
        // 更新当前状态
        setLocalPendingComments((prev) => [...prev, comment]);
      } catch (e) {
        console.error("保存本地待审核评论失败", e);
      }
    },
    [],
  );

  // 移除本地待审核评论（当服务器确认后）
  const removeLocalPendingComment = useCallback((localId: string) => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(LOCAL_PENDING_COMMENTS_KEY);
      if (saved) {
        const existing: LocalPendingComment[] = JSON.parse(saved);
        const filtered = existing.filter((c) => c.localId !== localId);
        localStorage.setItem(
          LOCAL_PENDING_COMMENTS_KEY,
          JSON.stringify(filtered),
        );
      }
      setLocalPendingComments((prev) =>
        prev.filter((c) => c.localId !== localId),
      );
    } catch (e) {
      console.error("移除本地待审核评论失败", e);
    }
  }, []);

  // 监听验证码消息
  useBroadcast((message: { type: string; token?: string }) => {
    if (message?.type === "captcha-solved" && message.token) {
      setCaptchaToken(message.token);
    }
  });

  // 加载评论（主级评论）
  const loadComments = useCallback(
    async (cursorParam?: string) => {
      setLoading(true);
      const startTime = Date.now();
      try {
        const result = await getPostComments({
          slug,
          pageSize: 10,
          maxDepth: 1, // 只加载主级评论，不预加载子评论
          cursor: cursorParam,
        });
        const response = await resolveApiResponse(result);
        if (response?.success && Array.isArray(response.data)) {
          const incoming = response.data as CommentItem[];
          const merged = cursorParam
            ? mergeBySortKey(comments, incoming)
            : incoming;
          setComments(merged);
          setHasNext(response.meta?.hasNext ?? false);
          const meta = response.meta as { nextCursor?: string } | undefined;
          setCursor(meta?.nextCursor);
        } else {
          toastError("加载评论失败", response?.message || "");
        }
      } catch (error) {
        console.error("加载评论失败", error);
        toastError("加载评论失败", "请稍后重试");
      } finally {
        // 确保加载指示器至少显示 0.5 秒
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, 500 - elapsed);
        await new Promise((resolve) => setTimeout(resolve, remaining));
        setLoading(false);
      }
    },
    [slug, comments, toastError],
  );

  // 加载直接子评论（分页）
  const loadDirectChildren = useCallback(
    async (parentId: string, cursorParam?: string) => {
      const currentState = childPaginationMap.get(parentId);

      // 如果正在加载，跳过
      if (currentState?.loading) {
        return;
      }

      // 更新加载状态
      setChildPaginationMap((prev) => {
        const next = new Map(prev);
        next.set(parentId, {
          ...currentState,
          cursor: currentState?.cursor,
          hasNext: currentState?.hasNext ?? false,
          loading: true,
          expanded: true,
        });
        return next;
      });

      try {
        const result = await getDirectChildren({
          parentId,
          postSlug: slug,
          pageSize: 10,
          cursor: cursorParam,
        });
        const response = await resolveApiResponse(result);

        if (response?.success && Array.isArray(response.data)) {
          const incoming = response.data as CommentItem[];
          const meta = response.meta as
            | { nextCursor?: string; hasNext?: boolean }
            | undefined;

          // 合并评论
          setComments((prev) => mergeBySortKey(prev, incoming));

          // 更新分页状态：设置父评论和所有预加载的子评论为已展开
          setChildPaginationMap((prev) => {
            const next = new Map(prev);

            // 1. 设置被点击的父评论为已展开
            next.set(parentId, {
              cursor: meta?.nextCursor,
              hasNext: meta?.hasNext ?? false,
              loading: false,
              expanded: true,
            });

            // 2. 初始化所有预加载的子评论的展开状态
            // 后端预加载了 3 层，需要将它们都标记为已展开
            incoming.forEach((comment) => {
              // 如果这个评论有子评论，且还没有展开状态，初始化为已展开
              if (
                (comment.replyCount > 0 || comment.hasMore) &&
                !next.has(comment.id)
              ) {
                // 检查是否有已加载的直接子评论
                const directChildren = incoming.filter(
                  (c) => c.parentId === comment.id,
                );
                const hasLoadedChildren = directChildren.length > 0;

                if (hasLoadedChildren) {
                  // 如果有预加载的子评论，标记为已展开
                  const hasMoreChildren =
                    directChildren.length < (comment.replyCount ?? 0);
                  const lastChild = directChildren.sort((a, b) =>
                    b.sortKey.localeCompare(a.sortKey),
                  )[0];

                  next.set(comment.id, {
                    expanded: true, // 预加载的评论标记为已展开
                    loading: false,
                    hasNext: hasMoreChildren,
                    cursor: lastChild?.sortKey,
                  });
                }
              }
            });

            return next;
          });
        } else {
          toastError("加载回复失败", response?.message || "");
          setChildPaginationMap((prev) => {
            const next = new Map(prev);
            const state = next.get(parentId);
            if (state) {
              next.set(parentId, { ...state, loading: false });
            }
            return next;
          });
        }
      } catch (error) {
        console.error("加载回复失败", error);
        toastError("加载回复失败", "请稍后重试");
        setChildPaginationMap((prev) => {
          const next = new Map(prev);
          const state = next.get(parentId);
          if (state) {
            next.set(parentId, { ...state, loading: false });
          }
          return next;
        });
      }
    },
    [slug, childPaginationMap, toastError],
  );

  // 评论区进入视口时加载
  useEffect(() => {
    if (!commentsContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !commentsLoaded) {
            setCommentsLoaded(true);
            loadComments();
          }
        });
      },
      { root: null, rootMargin: "200px 0px", threshold: 0.1 },
    );

    observer.observe(commentsContainerRef.current);
    return () => observer.disconnect();
  }, [commentsLoaded, loadComments]);

  // 主评论滚动加载更多
  useEffect(() => {
    if (!hasNext || !loadingIndicatorRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasNext && !loading) {
            loadComments(cursor);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px 600px 0px", // 提前600px开始加载
        threshold: 0,
      },
    );

    observer.observe(loadingIndicatorRef.current);

    return () => {
      observer.disconnect();
    };
  }, [cursor, hasNext, loading, loadComments]);

  // 初始化预加载评论的展开状态
  // 首次加载和自动加载都会预加载 3 层评论，需要将它们标记为已展开
  useEffect(() => {
    if (comments.length === 0) return;

    setChildPaginationMap((prev) => {
      const next = new Map(prev);

      // 找出所有有子评论且子评论已被预加载的评论
      comments.forEach((parent) => {
        // 跳过已经有展开状态的评论
        if (next.has(parent.id)) {
          return;
        }

        // 检查这个评论是否有子评论
        if ((parent.replyCount ?? 0) > 0 || parent.hasMore) {
          // 检查是否有已加载的直接子评论
          const directChildren = comments.filter(
            (c) => c.parentId === parent.id,
          );

          if (directChildren.length > 0) {
            // 有预加载的子评论，标记为已展开
            const hasMoreChildren =
              directChildren.length < (parent.replyCount ?? 0);
            // 获取最后一个子评论的 sortKey 作为 cursor
            const lastChild = directChildren.sort((a, b) =>
              b.sortKey.localeCompare(a.sortKey),
            )[0];

            next.set(parent.id, {
              expanded: true, // 服务端已预加载，标记为已展开
              loading: false,
              hasNext: hasMoreChildren,
              cursor: lastChild?.sortKey,
            });
          }
        }
      });

      return next;
    });
  }, [comments]);

  // 切换折叠状态
  const handleToggleCollapse = useCallback((commentId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  }, []);

  // 处理 hover
  const handleMouseEnter = useCallback((comment: CommentItem) => {
    const pathParts = comment.path.split("/");
    setHoveredPath(pathParts);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredPath([]);
  }, []);

  // 高亮处理（自动 3 秒后取消）
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleHighlight = useCallback((commentId: string | null) => {
    // 清除之前的定时器
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
    setHighlightedId(commentId);
    // 如果设置了高亮，3 秒后自动取消
    if (commentId) {
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedId((prev) => (prev === commentId ? null : prev));
        highlightTimerRef.current = null;
      }, 3000);
    }
  }, []);

  // 刷新评论
  const handleRefresh = useCallback(() => {
    if (!commentsLoaded) return;
    setComments([]);
    setCursor(undefined);
    setHasNext(false);
    setCollapsedIds(new Set());
    setChildPaginationMap(new Map());
    loadComments();
  }, [commentsLoaded, loadComments]);

  // 点赞/取消点赞
  const handleToggleLike = useCallback(
    async (commentId: string, currentIsLiked: boolean) => {
      // 检查登录状态
      if (isAnonymous) {
        toastError("登录后才能点赞评论");
        return;
      }

      // 乐观更新：立即更新 UI
      setComments((prev) =>
        prev.map((comment) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              likeCount: currentIsLiked
                ? comment.likeCount - 1
                : comment.likeCount + 1,
              isLiked: !currentIsLiked,
            };
          }
          return comment;
        }),
      );

      // 调用 Server Action
      try {
        const result = currentIsLiked
          ? await unlikeComment({ commentId })
          : await likeComment({ commentId });

        const response = await resolveApiResponse(result);

        if (!response?.success) {
          // 失败时回滚
          setComments((prev) =>
            prev.map((comment) => {
              if (comment.id === commentId) {
                return {
                  ...comment,
                  likeCount: currentIsLiked
                    ? comment.likeCount + 1
                    : comment.likeCount - 1,
                  isLiked: currentIsLiked,
                };
              }
              return comment;
            }),
          );
          toastError("操作失败", response?.message || "");
        } else if (response.data) {
          // 成功后用服务器返回的真实数据更新（确保一致性）
          const { likeCount, isLiked } = response.data;
          setComments((prev) =>
            prev.map((comment) => {
              if (comment.id === commentId) {
                return {
                  ...comment,
                  likeCount,
                  isLiked,
                };
              }
              return comment;
            }),
          );
        }
      } catch {
        // 网络错误，回滚 UI
        setComments((prev) =>
          prev.map((comment) => {
            if (comment.id === commentId) {
              return {
                ...comment,
                likeCount: currentIsLiked
                  ? comment.likeCount + 1
                  : comment.likeCount - 1,
                isLiked: currentIsLiked,
              };
            }
            return comment;
          }),
        );
        toastError("操作失败", "请稍后重试");
      }
    },
    [isAnonymous, toastError],
  );

  // 设置回复目标
  const handleReply = useCallback((comment: CommentItem) => {
    setReplyTarget(comment);
    // 滚动到输入框
    setTimeout(() => {
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  }, []);

  // 打开删除确认对话框
  const handleDeleteClick = useCallback((comment: CommentItem) => {
    setCommentToDelete(comment);
    setDeleteDialogOpen(true);
  }, []);

  // 确认删除评论
  const handleConfirmDelete = useCallback(async () => {
    if (!commentToDelete) return;

    setDeleting(true);
    try {
      const result = await deleteOwnComment({ commentId: commentToDelete.id });
      const response = await resolveApiResponse(result);

      if (response?.success) {
        // 从列表中移除评论
        setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));
        toastSuccess("评论已删除");
        setDeleteDialogOpen(false);
        setCommentToDelete(null);
      } else {
        toastError("删除失败", response?.message || "");
      }
    } catch (error) {
      console.error("删除评论失败", error);
      toastError("删除失败", "请稍后重试");
    } finally {
      setDeleting(false);
    }
  }, [commentToDelete, toastSuccess, toastError]);

  // 提交评论
  const handleSubmit = async () => {
    if (!allowComments) {
      toastError("评论已关闭", "该文章未开启评论");
      return;
    }
    if (!content.trim()) {
      toastError("评论不能为空");
      return;
    }
    if (content.length > 1000) {
      toastError("评论过长", "最多 1000 字");
      return;
    }
    if (isAnonymous && !commentConfig.anonymousEnabled) {
      toastError("请登录后再评论");
      return;
    }
    if (
      isAnonymous &&
      commentConfig.anonymousEmailRequired &&
      !authorEmail.trim()
    ) {
      toastError("请填写邮箱");
      return;
    }
    if (!captchaToken) {
      toastError("请先完成安全验证");
      return;
    }

    // 保存匿名用户信息
    if (isAnonymous) {
      saveAnonymousUserInfo();
    }

    // 准备本地待审核评论（用于网络失败时显示）
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const localComment: LocalPendingComment = {
      localId,
      slug,
      content: content.trim(),
      parentId: replyTarget?.id,
      authorName: authorName || "匿名",
      authorEmail: authorEmail || undefined,
      authorWebsite:
        commentConfig.anonymousWebsiteEnabled && authorWebsite
          ? authorWebsite
          : undefined,
      createdAt: new Date().toISOString(),
      replyToAuthorName: replyTarget?.author.displayName,
    };

    setSubmitting(true);
    try {
      const result = await createComment({
        slug,
        content,
        parentId: replyTarget?.id,
        authorName: isAnonymous ? authorName || "匿名" : undefined,
        authorEmail: isAnonymous ? authorEmail || undefined : undefined,
        authorWebsite:
          isAnonymous && commentConfig.anonymousWebsiteEnabled
            ? authorWebsite || undefined
            : undefined,
        captcha_token: captchaToken,
      });
      const response = await resolveApiResponse(result);
      if (response?.success && response.data) {
        const newComment = response.data as CommentItem;
        setComments((prev) => mergeBySortKey(prev, [newComment]));
        setContent("");
        setReplyTarget(null);

        // 如果评论状态是待审核，保存到本地（刷新后服务器可能不返回）
        if (newComment.status === "PENDING" && isAnonymous) {
          // 更新 localComment 的 ID 为服务器返回的 ID，方便后续匹配清理
          const pendingComment: LocalPendingComment = {
            ...localComment,
            localId: `server-${newComment.id}`, // 使用服务器 ID 作为标识
          };
          saveLocalPendingComment(pendingComment);
        }

        // 展开路径上所有折叠的评论
        if (newComment.path) {
          const pathIds = newComment.path.split("/").slice(0, -1); // 不包含自己
          setCollapsedIds((prev) => {
            const next = new Set(prev);
            pathIds.forEach((id) => next.delete(id));
            return next;
          });
          // 将父评论标记为已展开，确保新评论可见
          setChildPaginationMap((prev) => {
            const next = new Map(prev);
            pathIds.forEach((id) => {
              const existing = next.get(id);
              if (existing) {
                next.set(id, { ...existing, expanded: true });
              } else {
                next.set(id, {
                  hasNext: false,
                  loading: false,
                  expanded: true,
                });
              }
            });
            return next;
          });
        }

        // 高亮新评论并滚动到它
        handleHighlight(newComment.id);
        setTimeout(() => {
          const el = document.getElementById(`comment-${newComment.id}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);

        toastSuccess(
          newComment.status === "APPROVED"
            ? "评论发布成功"
            : "评论提交成功，等待审核",
        );
      } else {
        // 服务器返回失败，直接提示
        toastError("提交失败", response?.message || "");
      }
    } catch (error) {
      console.error("提交评论失败", error);
      // 网络错误，直接提示
      toastError("提交评论失败", "请稍后重试");
    } finally {
      setSubmitting(false);
      setCaptchaToken("");
      setTimeout(() => {
        setCaptchaLoaded(true);
        broadcast({ type: "captcha-reset" });
      }, 100);
    }
  };

  // 将本地待审核评论转换为 CommentItem 格式
  const localCommentsAsItems = useMemo((): CommentItem[] => {
    return localPendingComments.map((local) => ({
      id: local.localId,
      postSlug: local.slug,
      parentId: local.parentId ?? null,
      content: local.content,
      status: "PENDING" as const,
      mine: true,
      replyCount: 0,
      depth: local.parentId ? 1 : 0, // 简单处理深度
      path: local.parentId
        ? `${local.parentId}/${local.localId}`
        : local.localId,
      sortKey: `z-local-${local.createdAt}`, // 以 z 开头确保排在最后
      descendantCount: 0,
      hasMore: false,
      createdAt: local.createdAt,
      location: null,
      likeCount: 0, // 本地待审核评论，点赞数为 0
      isLiked: undefined, // 本地评论还未同步，无点赞状态
      author: {
        uid: null,
        username: null,
        nickname: null,
        avatar: null,
        displayName: local.authorName,
        website: local.authorWebsite ?? null,
        isAnonymous: true,
        emailMd5: null,
      },
      replyTo: local.replyToAuthorName
        ? { id: local.localId, authorName: local.replyToAuthorName }
        : undefined,
    }));
  }, [localPendingComments]);

  // 检查服务器评论是否与本地评论匹配（用于清理已同步的本地评论）
  useEffect(() => {
    if (comments.length === 0 || localPendingComments.length === 0) return;

    // 检查每个本地评论是否已经在服务器评论中存在
    localPendingComments.forEach((local) => {
      // 方式1: 通过服务器 ID 匹配（server-xxx 格式）
      if (local.localId.startsWith("server-")) {
        const serverId = local.localId.replace("server-", "");
        const matched = comments.find((c) => c.id === serverId);
        if (matched) {
          // 如果评论已通过审核，清理本地缓存
          if (matched.status === "APPROVED") {
            removeLocalPendingComment(local.localId);
          }
          // 如果仍是待审核状态，保留本地缓存（服务器可能不返回）
          return;
        }
      }

      // 方式2: 通过内容和作者名匹配（用于网络错误后重试成功的情况）
      const matched = comments.find(
        (c) =>
          c.content === local.content &&
          c.author.displayName === local.authorName &&
          c.mine === true,
      );
      if (matched) {
        // 找到匹配的服务器评论，清理本地缓存
        removeLocalPendingComment(local.localId);
      }
    });
  }, [comments, localPendingComments, removeLocalPendingComment]);

  // 过滤掉被折叠隐藏的评论，并合并本地待审核评论
  // 显示已展开的子评论及其预加载的后代评论
  const visibleComments = useMemo(() => {
    // 先过滤服务器评论
    const filteredServerComments = comments.filter((c) => {
      // 1. 检查是否被父评论折叠
      if (isHiddenByCollapse(c, collapsedIds, commentsMap)) {
        return false;
      }

      // 2. 检查评论的所有祖先是否都已展开
      // 获取评论的所有祖先 ID（从 path 中解析）
      const ancestorIds = c.path.split("/").slice(0, -1); // 去掉自己

      // 如果有祖先评论
      if (ancestorIds.length > 0) {
        // 检查每个祖先是否已展开
        for (const ancestorId of ancestorIds) {
          const ancestorState = childPaginationMap.get(ancestorId);
          // 如果祖先未展开，则不显示这个评论
          if (!ancestorState?.expanded) {
            return false;
          }
        }
      }

      return true;
    });

    // 过滤掉已经在服务器评论中存在的本地评论（避免重复显示）
    const filteredLocalComments = localCommentsAsItems.filter((local) => {
      // 检查是否有服务器 ID 匹配
      if (local.id.startsWith("server-")) {
        const serverId = local.id.replace("server-", "");
        const existsInServer = comments.some((c) => c.id === serverId);
        if (existsInServer) return false;
      }
      // 检查内容是否重复
      const isDuplicate = comments.some(
        (c) =>
          c.content === local.content &&
          c.author.displayName === local.author.displayName &&
          c.mine === true,
      );
      return !isDuplicate;
    });

    // 合并本地评论（放在最后）
    return [...filteredServerComments, ...filteredLocalComments];
  }, [
    comments,
    collapsedIds,
    commentsMap,
    localCommentsAsItems,
    childPaginationMap,
  ]);

  // 计算每个父评论的最后一个直接子评论 ID
  // 用于确定 Sentinel 的放置位置
  const lastDirectChildMap = useMemo(() => {
    const map = new Map<string, string>(); // parentId -> lastChildId

    // 遍历可见评论，找出每个父评论的最后一个直接子评论
    visibleComments.forEach((c) => {
      if (c.parentId) {
        // 这个评论是某个父评论的子评论
        // 由于评论按 sortKey 排序，后面的会覆盖前面的，所以最后设置的就是最后一个
        map.set(c.parentId, c.id);
      }
    });

    return map;
  }, [visibleComments]);

  // 判断评论是否在 hover 路径中
  const isInHoverPath = useCallback(
    (comment: CommentItem) => hoveredPath.includes(comment.id),
    [hoveredPath],
  );

  // 判断是否是当前 hover 的评论
  const isCurrentHovered = useCallback(
    (comment: CommentItem) =>
      hoveredPath.length > 0 &&
      hoveredPath[hoveredPath.length - 1] === comment.id,
    [hoveredPath],
  );

  // 判断是否是 hover 评论的直接父评论
  const isDirectParent = useCallback(
    (comment: CommentItem) => {
      if (hoveredPath.length < 2) return false;
      return hoveredPath[hoveredPath.length - 2] === comment.id;
    },
    [hoveredPath],
  );

  // 如果不允许评论，不渲染
  if (!allowComments) {
    return null;
  }

  return (
    <div
      id="comments"
      className="max-w-5xl mx-auto pb-10 pt-8"
      ref={commentsContainerRef}
    >
      <h2
        className="text-2xl font-semibold mb-4 flex items-center gap-2"
        id="comment"
      >
        评论
        <AutoTransition>
          <span key={comments.length} className="text-lg text-muted-foreground">
            {comments.length > 0 && `(${comments.length})`}
          </span>
        </AutoTransition>
      </h2>

      {/* 评论输入区 */}
      <div className="space-y-3 mb-6">
        <AutoResizer>
          <AutoTransition>
            {replyTarget && (
              <div className="bg-muted/30 p-3 border-l-4 border-muted mb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                      <RiReplyLine size={"1em"} />
                      <span>正在回复</span>
                      <span className="font-semibold text-foreground">
                        {replyTarget.author.displayName}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-2 pl-5">
                      {replyTarget.content.length > 100
                        ? `${replyTarget.content.slice(0, 100)}...`
                        : replyTarget.content}
                    </div>
                  </div>
                  <Clickable
                    onClick={() => setReplyTarget(null)}
                    className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  >
                    <RiCloseLine size={18} />
                  </Clickable>
                </div>
              </div>
            )}
          </AutoTransition>
        </AutoResizer>

        {isAnonymous && commentConfig.anonymousEnabled && (
          <div
            className={`grid grid-cols-1 gap-3 ${commentConfig.anonymousWebsiteEnabled ? "md:grid-cols-3" : "md:grid-cols-2"}`}
          >
            <Input
              label="昵称"
              helperText="选填，默认为匿名"
              size="sm"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
            <Input
              label={commentConfig.anonymousEmailRequired ? "邮箱*" : "邮箱"}
              required={commentConfig.anonymousEmailRequired}
              helperText="用于头像和通知"
              size="sm"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
            />
            {commentConfig.anonymousWebsiteEnabled && (
              <Input
                label="个人网站"
                helperText="选填"
                size="sm"
                value={authorWebsite}
                onChange={(e) => setAuthorWebsite(e.target.value)}
              />
            )}
          </div>
        )}
        <div ref={inputRef}>
          <Input
            label=""
            rows={4}
            size="sm"
            maxLength={1000}
            placeholder={commentConfig.placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => !captchaLoaded && setCaptchaLoaded(true)}
            className="mt-0 pt-0"
          />
        </div>

        {/* 预览区域 */}
        <AutoResizer duration={0.3}>
          <div>
            <AutoTransition type="fade" duration={0.2} initial={false}>
              {showPreview && content.trim() ? (
                <div
                  key="preview"
                  className="p-4 bg-muted/20 border border-muted rounded-sm"
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none break-words md-content mini-md-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks]}
                      skipHtml
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div key="no-preview" style={{ height: 0 }} />
              )}
            </AutoTransition>
          </div>
        </AutoResizer>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Tooltip content="支持 Markdown 语法">
              <RiMarkdownLine size={20} />
            </Tooltip>
            <Tooltip content="刷新评论">
              <Clickable onClick={handleRefresh} className="ml-auto">
                <RiRefreshLine
                  size={20}
                  className="text-muted-foreground hover:text-foreground"
                />
              </Clickable>
            </Tooltip>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">
              {content.length} / 1000
            </span>
            {/* 预览按钮 */}
            <Button
              label={showPreview ? "收起" : "预览"}
              size="sm"
              variant="secondary"
              onClick={() => setShowPreview(!showPreview)}
              disabled={!content.trim()}
            />
            {isAnonymous && (
              <Tooltip content="登录至现有账号，或使用 Github/Google/Microsoft 账号快捷登录">
                <Button
                  label="登录"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    navigate(
                      "/login?redirect=" +
                        encodeURIComponent(window.location.pathname) +
                        "#comment",
                    )
                  }
                ></Button>
              </Tooltip>
            )}

            {captchaLoaded ? (
              <CaptchaButton
                size="sm"
                label={
                  submitting
                    ? isAnonymous
                      ? "评论发送中"
                      : "正在发送"
                    : isAnonymous
                      ? "免登录评论"
                      : "发送评论"
                }
                loading={submitting}
                verificationText={isAnonymous ? "安全验证中" : "正在验证"}
                onClick={handleSubmit}
              />
            ) : (
              <Tooltip content="请输入评论内容">
                <Button
                  size="sm"
                  variant="primary"
                  disabled
                  label={isAnonymous ? "免登录评论" : "发送评论"}
                />
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* 评论列表 */}
      <AutoResizer>
        <AutoTransition type="fade" duration={0.2} initial={false}>
          {!commentsLoaded ? (
            <div
              key="loading"
              className="flex items-center gap-2 py-4 text-sm text-muted-foreground w-full h-24 justify-center"
            >
              <LoadingIndicator />
            </div>
          ) : (
            <div key="loaded">
              <AnimatePresence initial={false}>
                {visibleComments.map((comment) => {
                  const childState = childPaginationMap.get(comment.id);

                  // 检查这个评论是否是某个父评论的最后一个直接子评论
                  // 如果是，需要在它后面放置父评论的 Sentinel
                  const parentId = comment.parentId;
                  const isLastDirectChild =
                    parentId && lastDirectChildMap.get(parentId) === comment.id;

                  // 获取父评论的分页状态
                  const parentState = parentId
                    ? childPaginationMap.get(parentId)
                    : null;
                  const parentComment = parentId
                    ? commentsMap.get(parentId)
                    : null;

                  // 判断是否需要在这个评论后面显示父评论的 Sentinel（加载更多场景）
                  const showParentSentinel =
                    isLastDirectChild &&
                    parentState?.expanded &&
                    parentState.hasNext &&
                    !collapsedIds.has(parentId);

                  return (
                    <React.Fragment key={comment.id}>
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                          height: "auto",
                          opacity: 1,
                          transition: {
                            height: { duration: 0.3, ease: "easeInOut" },
                            opacity: { duration: 0.2, delay: 0.1 },
                          },
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                          transition: {
                            height: {
                              duration: 0.3,
                              ease: "easeInOut",
                              delay: 0.1,
                            },
                            opacity: { duration: 0.2 },
                          },
                        }}
                        style={{ overflow: "hidden" }}
                        onMouseEnter={() => handleMouseEnter(comment)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <SingleComment
                          comment={comment}
                          onReply={handleReply}
                          onToggleCollapse={handleToggleCollapse}
                          onExpandChildren={loadDirectChildren}
                          onHighlight={handleHighlight}
                          onToggleLike={handleToggleLike}
                          onDelete={handleDeleteClick}
                          childPaginationState={childState}
                          isCollapsed={collapsedIds.has(comment.id)}
                          isHighlighted={highlightedId === comment.id}
                          isInHoverPath={isInHoverPath(comment)}
                          isCurrentHovered={isCurrentHovered(comment)}
                          isDirectParent={isDirectParent(comment)}
                          authorUid={authorUid}
                          navigate={navigate}
                        />
                      </motion.div>
                      {/* 父评论的子评论加载更多按钮（放在最后一个直接子评论之后） */}
                      <AutoResizer duration={0.3}>
                        <AutoTransition type="fade" duration={0.2}>
                          {showParentSentinel && parentComment && (
                            <LoadMoreChildrenButton
                              key={`parent-loadmore-${parentId}`}
                              parentId={parentId}
                              loading={parentState?.loading ?? false}
                              depth={parentComment.depth}
                              remainingCount={
                                (parentComment.replyCount || 0) -
                                visibleComments.filter(
                                  (c) => c.parentId === parentId,
                                ).length
                              }
                              onLoadMore={(pid) =>
                                loadDirectChildren(pid, parentState?.cursor)
                              }
                            />
                          )}
                        </AutoTransition>
                      </AutoResizer>
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>
              {/* 主评论加载指示器 */}
              {hasNext && (
                <div ref={loadingIndicatorRef}>
                  <AutoResizer duration={0.3}>
                    <AutoTransition type="fade" duration={0.2}>
                      {loading ? (
                        <div
                          key="loading"
                          className="flex items-center gap-2 py-4 text-sm text-muted-foreground w-full h-24 justify-center"
                        >
                          <LoadingIndicator />
                        </div>
                      ) : (
                        <div key="idle" className="h-4" />
                      )}
                    </AutoTransition>
                  </AutoResizer>
                </div>
              )}
              <AutoTransition type="fade" duration={0.3}>
                {!loading && comments.length === 0 && (
                  <div
                    key="empty"
                    className="text-muted-foreground text-sm py-8 text-center"
                  >
                    暂无评论
                  </div>
                )}
              </AutoTransition>
            </div>
          )}
        </AutoTransition>
      </AutoResizer>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="确认删除评论"
        description="删除后将无法恢复，确定要删除这条评论吗？"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
