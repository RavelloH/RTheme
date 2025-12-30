"use server";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  CreateComment,
  CreateCommentSchema,
  CommentItem,
  CommentListResponse,
  GetPostComments,
  GetPostCommentsSchema,
  GetCommentContext,
  GetCommentContextSchema,
  GetCommentReplies,
  GetCommentRepliesSchema,
  GetDirectChildren,
  GetDirectChildrenSchema,
  DirectChildrenResponse,
  UpdateCommentStatus,
  UpdateCommentStatusSchema,
  DeleteComments,
  DeleteCommentsSchema,
  CommentsAdminListResponse,
  GetCommentsAdmin,
  GetCommentsAdminSchema,
  CommentStats,
  CommentStatus,
  CommentHistoryPoint,
  GetCommentHistory,
  GetCommentHistorySchema,
  GetCommentStats,
  GetCommentStatsSchema,
  LikeComment,
  LikeCommentSchema,
  LikeCommentResponse,
  UnlikeComment,
  UnlikeCommentSchema,
  UnlikeCommentResponse,
  DeleteOwnComment,
  DeleteOwnCommentSchema,
  DeleteOwnCommentResponse,
} from "@repo/shared-types/api/comment";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rate-limit";
import { validateData } from "@/lib/server/validator";
import { authVerify } from "@/lib/server/auth-verify";
import { getClientIP } from "@/lib/server/get-client-info";
import { resolveIpLocation } from "@/lib/server/ip-utils";
import { verifyToken } from "./captcha";
import { getConfig } from "@/lib/server/config-cache";
import type { UserRole } from "@/lib/server/auth-verify";
import prisma from "@/lib/server/prisma";
import crypto from "crypto";
import type { Prisma } from ".prisma/client";
import { getCache, setCache, generateCacheKey } from "@/lib/server/cache";

const COMMENT_ROLES: UserRole[] = ["USER", "ADMIN", "EDITOR", "AUTHOR"];

// 计算 MD5 哈希值的辅助函数
function calculateMD5(text: string): string {
  return crypto
    .createHash("md5")
    .update(text.toLowerCase().trim())
    .digest("hex");
}

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

async function loadPostId(slug: string) {
  const post = await prisma.post.findUnique({
    where: { slug, status: "PUBLISHED", deletedAt: null },
    select: { id: true, allowComments: true },
  });
  return post;
}

function buildPaginationMeta({
  page,
  pageSize,
  total,
  hasNext,
}: {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}) {
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNext,
    hasPrev: page > 1,
  };
}

const commentSelect = {
  id: true,
  content: true,
  status: true,
  createdAt: true,
  parentId: true,
  post: { select: { slug: true } },
  userUid: true,
  authorName: true,
  authorEmail: true,
  authorWebsite: true,
  ipAddress: true,
  // 层级树形结构字段
  depth: true,
  path: true,
  sortKey: true,
  replyCount: true,
  // 点赞相关
  likeCount: true,
  user: {
    select: {
      uid: true,
      username: true,
      nickname: true,
      avatar: true,
      website: true,
    },
  },
  parent: {
    select: {
      id: true,
      authorName: true,
      user: { select: { nickname: true, username: true } },
    },
  },
} satisfies Prisma.CommentSelect;

type PublicComment = Prisma.CommentGetPayload<{
  select: typeof commentSelect;
}>;
const adminCommentSelect = {
  ...commentSelect,
  post: { select: { slug: true, title: true } },
} satisfies Prisma.CommentSelect;
type AdminComment = Prisma.CommentGetPayload<{
  select: typeof adminCommentSelect;
}>;

async function mapCommentToItem(
  comment: PublicComment,
  currentUid: number | null,
  showLocation: boolean,
  maxDepth?: number, // 用于判断是否有更多深层子评论
  isLiked?: boolean, // 当前用户是否已点赞
): Promise<CommentItem> {
  const displayName =
    comment.user?.nickname ||
    comment.user?.username ||
    comment.authorName ||
    "匿名";

  // 解析 IP 归属地
  const locationData = showLocation
    ? resolveIpLocation(comment.ipAddress)
    : null;
  const location = locationData
    ? [locationData.country, locationData.region, locationData.city]
        .filter(Boolean)
        .join(" ") || null
    : null;

  // 计算邮箱的 MD5 值
  const emailMd5 = comment.authorEmail
    ? calculateMD5(comment.authorEmail)
    : null;

  // 判断是否有未加载的子评论
  // maxDepth = 0 表示不预加载任何子评论，只要有子评论就标记为 hasMore
  // maxDepth = 1 表示只加载当前层级，有子评论就标记为 hasMore
  // maxDepth > 1 时，按原逻辑判断深层子评论
  const hasMore =
    maxDepth !== undefined &&
    comment.replyCount > 0 &&
    (maxDepth <= 1 || comment.depth >= maxDepth - 1);

  // 从数据库查询此评论的所有后代数量（使用 path 前缀匹配）
  const descendantCount = await prisma.comment.count({
    where: {
      path: { startsWith: comment.path + "/" },
      deletedAt: null,
      OR: [
        { status: "APPROVED" },
        ...(currentUid ? [{ userUid: currentUid }] : []),
      ],
    },
  });

  return {
    id: comment.id,
    postSlug: comment.post.slug,
    parentId: comment.parentId,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    mine: comment.userUid !== null && comment.userUid === currentUid,
    replyCount: comment.replyCount,
    author: {
      uid: comment.user?.uid ?? null,
      username: comment.user?.username ?? null,
      nickname: comment.user?.nickname ?? null,
      avatar: comment.user?.avatar ?? null,
      website: comment.user?.website ?? comment.authorWebsite ?? null,
      displayName,
      isAnonymous: !comment.user,
      emailMd5,
    },
    location,
    replyTo: comment.parent
      ? {
          id: comment.parent.id,
          authorName:
            comment.parent.user?.nickname ||
            comment.parent.user?.username ||
            comment.parent.authorName ||
            "匿名",
        }
      : null,
    // 层级树形结构字段
    depth: comment.depth,
    path: comment.path,
    sortKey: comment.sortKey,
    hasMore,
    descendantCount,
    // 点赞相关
    likeCount: comment.likeCount,
    isLiked: currentUid !== null ? isLiked : undefined,
  };
}

async function ensureCaptcha(token?: string) {
  if (!token) return { success: false };
  return verifyToken(token);
}

export async function getPostComments(
  params: GetPostComments,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CommentListResponse["data"] | null>>>;
export async function getPostComments(
  params: GetPostComments,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CommentListResponse["data"] | null>>;
export async function getPostComments(
  params: GetPostComments,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CommentListResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getPostComments"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetPostCommentsSchema);
  if (validationError) return response.badRequest(validationError);

  const { slug, pageSize, cursor } = params;

  const commentEnabled = await getConfig<boolean>("comment.enable", true);
  if (!commentEnabled) {
    return response.forbidden({ message: "评论功能已关闭" });
  }

  const post = await loadPostId(slug);
  if (!post) {
    return response.notFound({ message: "文章不存在或未发布" });
  }
  if (!post.allowComments) {
    return response.forbidden({ message: "该文章未开启评论" });
  }

  const authUser = await authVerify({ allowedRoles: COMMENT_ROLES });
  const currentUid = authUser?.uid ?? null;

  // 只获取顶级评论（分页），不再自动加载子评论
  const rootWhere: Prisma.CommentWhereInput = {
    postId: post.id,
    deletedAt: null,
    parentId: null, // 仅顶级评论
    OR: [
      { status: "APPROVED" },
      ...(currentUid ? [{ userUid: currentUid }] : []),
    ],
    ...(cursor ? { sortKey: { gt: cursor } } : {}),
  };

  const [rootComments, showLocation, totalComments] = await Promise.all([
    prisma.comment.findMany({
      where: rootWhere,
      orderBy: { sortKey: "asc" },
      take: pageSize + 1,
      select: commentSelect,
    }),
    getConfig<boolean>("comment.locate.enable", false),
    prisma.comment.count({
      where: {
        postId: post.id,
        deletedAt: null,
        OR: [
          { status: "APPROVED" },
          ...(currentUid ? [{ userUid: currentUid }] : []),
        ],
      },
    }),
  ]);

  const hasNext = rootComments.length > pageSize;
  const slicedRoots = rootComments.slice(0, pageSize);

  if (slicedRoots.length === 0) {
    return response.ok({
      data: [] as unknown as CommentListResponse["data"],
      meta: {
        page: 1,
        pageSize,
        total: totalComments,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  }

  // 预加载子评论：每个主评论最多5条一级子评论，每个一级子评论最多5条二级子评论
  const PRELOAD_LIMIT = 5;
  const rootIds = slicedRoots.map((c) => c.id);

  // 获取一级子评论（parentId 在 rootIds 中）
  const level1Comments = await prisma.comment.findMany({
    where: {
      parentId: { in: rootIds },
      deletedAt: null,
      OR: [
        { status: "APPROVED" },
        ...(currentUid ? [{ userUid: currentUid }] : []),
      ],
    },
    orderBy: { sortKey: "asc" },
    select: commentSelect,
  });

  // 按父评论分组，每个父评论最多取5条
  const level1ByParent = new Map<string, PublicComment[]>();
  for (const c of level1Comments) {
    if (!c.parentId) continue;
    const list = level1ByParent.get(c.parentId) || [];
    if (list.length < PRELOAD_LIMIT) {
      list.push(c);
      level1ByParent.set(c.parentId, list);
    }
  }

  // 获取需要预加载二级子评论的一级评论ID
  const level1Ids: string[] = [];
  for (const list of level1ByParent.values()) {
    for (const c of list) {
      level1Ids.push(c.id);
    }
  }

  // 获取二级子评论（parentId 在 level1Ids 中）
  const level2Comments =
    level1Ids.length > 0
      ? await prisma.comment.findMany({
          where: {
            parentId: { in: level1Ids },
            deletedAt: null,
            OR: [
              { status: "APPROVED" },
              ...(currentUid ? [{ userUid: currentUid }] : []),
            ],
          },
          orderBy: { sortKey: "asc" },
          select: commentSelect,
        })
      : [];

  // 按父评论分组，每个父评论最多取5条
  const level2ByParent = new Map<string, PublicComment[]>();
  for (const c of level2Comments) {
    if (!c.parentId) continue;
    const list = level2ByParent.get(c.parentId) || [];
    if (list.length < PRELOAD_LIMIT) {
      list.push(c);
      level2ByParent.set(c.parentId, list);
    }
  }

  // 收集所有评论ID用于批量查询点赞状态
  const allCommentIds: string[] = [...rootIds, ...level1Ids];
  for (const list of level2ByParent.values()) {
    for (const c of list) {
      allCommentIds.push(c.id);
    }
  }

  // 如果用户已登录，批量查询点赞状态
  let likedCommentIds: Set<string> = new Set();
  if (currentUid && allCommentIds.length > 0) {
    const likes = await prisma.commentLike.findMany({
      where: {
        commentId: { in: allCommentIds },
        userId: currentUid,
      },
      select: { commentId: true },
    });
    likedCommentIds = new Set(likes.map((like) => like.commentId));
  }

  // 转换为响应格式
  // 构建扁平化的评论列表，按 sortKey 排序
  const allCommentsToProcess: PublicComment[] = [];

  // 添加主评论及其预加载的子评论
  for (const root of slicedRoots) {
    allCommentsToProcess.push(root);
    const level1List = level1ByParent.get(root.id) || [];
    for (const l1 of level1List) {
      allCommentsToProcess.push(l1);
      const level2List = level2ByParent.get(l1.id) || [];
      for (const l2 of level2List) {
        allCommentsToProcess.push(l2);
      }
    }
  }

  // 按 sortKey 排序确保正确的显示顺序
  allCommentsToProcess.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const data: CommentItem[] = [];
  for (const c of allCommentsToProcess) {
    // maxDepth = 3 表示预加载到第三层（depth 0, 1, 2），更深的标记为 hasMore
    data.push(
      await mapCommentToItem(
        c,
        currentUid,
        showLocation,
        3, // 预加载三层评论
        likedCommentIds.has(c.id),
      ),
    );
  }

  // 计算分页元数据
  const lastRoot = slicedRoots[slicedRoots.length - 1];
  const nextCursor = hasNext ? lastRoot?.sortKey : undefined;

  const meta = {
    page: cursor ? 2 : 1,
    pageSize,
    total: totalComments,
    totalPages: hasNext ? 2 : 1,
    hasNext,
    hasPrev: !!cursor,
    nextCursor,
  };

  return response.ok({
    data: data as unknown as CommentListResponse["data"],
    meta,
  });
}

export async function getCommentContext(
  params: GetCommentContext,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CommentListResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCommentContext"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetCommentContextSchema);
  if (validationError) return response.badRequest(validationError);

  const { commentId } = params;
  const authUser = await authVerify({ allowedRoles: COMMENT_ROLES });
  const currentUid = authUser?.uid ?? null;

  const target = await prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
    select: { id: true, parentId: true, post: { select: { slug: true } } },
  });
  if (!target) return response.notFound({ message: "评论不存在" });

  const chain: CommentItem[] = [];
  let currentId: string | null = target.id;
  let guard = 0;
  const showLocation = await getConfig<boolean>("comment.locate.enable", false);

  // 收集所有评论ID用于批量查询点赞状态
  const commentIds: string[] = [];
  const tempComments: PublicComment[] = [];

  // 第一遍：收集评论链
  while (currentId && guard < 20) {
    const comment: PublicComment | null = await prisma.comment.findUnique({
      where: { id: currentId, deletedAt: null },
      select: commentSelect,
    });

    if (!comment) break;

    const visible =
      comment.status === "APPROVED" ||
      (currentUid !== null && comment.userUid === currentUid);
    if (!visible) break;

    tempComments.unshift(comment);
    commentIds.unshift(comment.id);
    currentId = comment.parentId;
    guard += 1;
  }

  // 批量查询点赞状态
  let likedCommentIds: Set<string> = new Set();
  if (currentUid && commentIds.length > 0) {
    const likes = await prisma.commentLike.findMany({
      where: {
        commentId: { in: commentIds },
        userId: currentUid,
      },
      select: { commentId: true },
    });
    likedCommentIds = new Set(likes.map((like) => like.commentId));
  }

  // 第二遍：转换为 CommentItem
  for (const comment of tempComments) {
    chain.push(
      await mapCommentToItem(
        comment,
        currentUid,
        showLocation,
        undefined,
        likedCommentIds.has(comment.id),
      ),
    );
  }

  const meta = buildPaginationMeta({
    page: 1,
    pageSize: chain.length || 1,
    total: chain.length,
    hasNext: false,
  });

  return response.ok({
    data: chain as unknown as CommentListResponse["data"],
    meta,
  });
}

export async function getCommentReplies(
  params: GetCommentReplies,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CommentListResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCommentReplies"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetCommentRepliesSchema);
  if (validationError) return response.badRequest(validationError);

  const { commentId, maxDepth } = params;

  // 获取父评论信息
  const parent = await prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
    select: {
      id: true,
      depth: true,
      path: true,
      post: { select: { slug: true } },
    },
  });
  if (!parent) return response.notFound({ message: "评论不存在" });

  const authUser = await authVerify({ allowedRoles: COMMENT_ROLES });
  const currentUid = authUser?.uid ?? null;
  const showLocation = await getConfig<boolean>("comment.locate.enable", false);

  // 获取该评论下所有深层子评论（相对深度限制）
  const maxAbsoluteDepth = parent.depth + maxDepth;
  const pathPrefix = parent.path ? `${parent.path}/` : `${parent.id}/`;

  const where: Prisma.CommentWhereInput = {
    deletedAt: null,
    path: { startsWith: pathPrefix },
    depth: { gt: parent.depth, lte: maxAbsoluteDepth },
    OR: [
      { status: "APPROVED" },
      ...(currentUid ? [{ userUid: currentUid }] : []),
    ],
  };

  const rawComments = await prisma.comment.findMany({
    where,
    orderBy: { sortKey: "asc" },
    select: commentSelect,
  });

  // 批量查询点赞状态
  let likedCommentIds: Set<string> = new Set();
  if (currentUid && rawComments.length > 0) {
    const commentIds = rawComments.map((c) => c.id);
    const likes = await prisma.commentLike.findMany({
      where: {
        commentId: { in: commentIds },
        userId: currentUid,
      },
      select: { commentId: true },
    });
    likedCommentIds = new Set(likes.map((like) => like.commentId));
  }

  const data: CommentItem[] = [];
  for (const c of rawComments) {
    data.push(
      await mapCommentToItem(
        c,
        currentUid,
        showLocation,
        maxAbsoluteDepth,
        likedCommentIds.has(c.id),
      ),
    );
  }

  const meta = buildPaginationMeta({
    page: 1,
    pageSize: data.length || 1,
    total: data.length,
    hasNext: false,
  });

  return response.ok({
    data: data as unknown as CommentListResponse["data"],
    meta,
  });
}

// 获取直接子评论（分页，并预加载下三层）
export async function getDirectChildren(
  params: GetDirectChildren,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DirectChildrenResponse["data"] | null>>>;
export async function getDirectChildren(
  params: GetDirectChildren,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DirectChildrenResponse["data"] | null>>;
export async function getDirectChildren(
  params: GetDirectChildren,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DirectChildrenResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getDirectChildren"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetDirectChildrenSchema);
  if (validationError) return response.badRequest(validationError);

  const { parentId, postSlug, pageSize, cursor } = params;

  const commentEnabled = await getConfig<boolean>("comment.enable", true);
  if (!commentEnabled) {
    return response.forbidden({ message: "评论功能已关闭" });
  }

  const post = await loadPostId(postSlug);
  if (!post) {
    return response.notFound({ message: "文章不存在或未发布" });
  }
  if (!post.allowComments) {
    return response.forbidden({ message: "该文章未开启评论" });
  }

  const authUser = await authVerify({ allowedRoles: COMMENT_ROLES });
  const currentUid = authUser?.uid ?? null;

  // 获取父评论信息（如果有）
  let parentDepth = -1; // -1 表示查询主级评论
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId, deletedAt: null },
      select: { depth: true },
    });
    if (!parent) {
      return response.notFound({ message: "父评论不存在" });
    }
    parentDepth = parent.depth;
  }

  // 构建查询条件：只查询直接子评论（depth = parentDepth + 1）
  const where: Prisma.CommentWhereInput = {
    postId: post.id,
    deletedAt: null,
    parentId: parentId, // null 表示主级评论
    depth: parentDepth + 1,
    OR: [
      { status: "APPROVED" },
      ...(currentUid ? [{ userUid: currentUid }] : []),
    ],
    ...(cursor ? { sortKey: { gt: cursor } } : {}),
  };

  const [rawComments, showLocation] = await Promise.all([
    prisma.comment.findMany({
      where,
      orderBy: { sortKey: "asc" },
      take: pageSize + 1,
      select: commentSelect,
    }),
    getConfig<boolean>("comment.locate.enable", false),
  ]);

  const hasNext = rawComments.length > pageSize;
  const slicedComments = rawComments.slice(0, pageSize);

  if (slicedComments.length === 0) {
    return response.ok({
      data: [] as unknown as DirectChildrenResponse["data"],
      meta: {
        page: 1,
        pageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: !!cursor,
      },
    });
  }

  // ========== 预加载下三层子评论（与 getPostComments 相同的逻辑） ==========
  const PRELOAD_LIMIT = 5;
  const level0Ids = slicedComments.map((c) => c.id); // 第一层（直接子评论）

  // 获取第二层子评论（parentId 在 level0Ids 中）
  const level1Comments = await prisma.comment.findMany({
    where: {
      parentId: { in: level0Ids },
      deletedAt: null,
      OR: [
        { status: "APPROVED" },
        ...(currentUid ? [{ userUid: currentUid }] : []),
      ],
    },
    orderBy: { sortKey: "asc" },
    select: commentSelect,
  });

  // 按父评论分组，每个父评论最多取 5 条
  const level1ByParent = new Map<string, PublicComment[]>();
  for (const c of level1Comments) {
    if (!c.parentId) continue;
    const list = level1ByParent.get(c.parentId) || [];
    if (list.length < PRELOAD_LIMIT) {
      list.push(c);
      level1ByParent.set(c.parentId, list);
    }
  }

  // 获取需要预加载第三层子评论的第二层评论 ID
  const level1Ids: string[] = [];
  for (const list of level1ByParent.values()) {
    for (const c of list) {
      level1Ids.push(c.id);
    }
  }

  // 获取第三层子评论（parentId 在 level1Ids 中）
  const level2Comments =
    level1Ids.length > 0
      ? await prisma.comment.findMany({
          where: {
            parentId: { in: level1Ids },
            deletedAt: null,
            OR: [
              { status: "APPROVED" },
              ...(currentUid ? [{ userUid: currentUid }] : []),
            ],
          },
          orderBy: { sortKey: "asc" },
          select: commentSelect,
        })
      : [];

  // 按父评论分组，每个父评论最多取 5 条
  const level2ByParent = new Map<string, PublicComment[]>();
  for (const c of level2Comments) {
    if (!c.parentId) continue;
    const list = level2ByParent.get(c.parentId) || [];
    if (list.length < PRELOAD_LIMIT) {
      list.push(c);
      level2ByParent.set(c.parentId, list);
    }
  }

  // 收集所有评论 ID 用于批量查询点赞状态
  const allCommentIds: string[] = [...level0Ids, ...level1Ids];
  for (const list of level2ByParent.values()) {
    for (const c of list) {
      allCommentIds.push(c.id);
    }
  }

  // 如果用户已登录，批量查询点赞状态
  let likedCommentIds: Set<string> = new Set();
  if (currentUid && allCommentIds.length > 0) {
    const likes = await prisma.commentLike.findMany({
      where: {
        commentId: { in: allCommentIds },
        userId: currentUid,
      },
      select: { commentId: true },
    });
    likedCommentIds = new Set(likes.map((like) => like.commentId));
  }

  // 构建扁平化的评论列表，按 sortKey 排序
  const allCommentsToProcess: PublicComment[] = [];

  // 添加第一层评论及其预加载的子评论
  for (const level0 of slicedComments) {
    allCommentsToProcess.push(level0);
    const level1List = level1ByParent.get(level0.id) || [];
    for (const l1 of level1List) {
      allCommentsToProcess.push(l1);
      const level2List = level2ByParent.get(l1.id) || [];
      for (const l2 of level2List) {
        allCommentsToProcess.push(l2);
      }
    }
  }

  // 按 sortKey 排序确保正确的显示顺序
  allCommentsToProcess.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  // 转换为响应格式
  const data: CommentItem[] = [];
  // 计算 maxDepth：基于父评论的 depth + 3 层
  const maxAbsoluteDepth = parentDepth + 4; // parentDepth + 1 (第一层) + 3 (预加载三层)
  for (const c of allCommentsToProcess) {
    data.push(
      await mapCommentToItem(
        c,
        currentUid,
        showLocation,
        maxAbsoluteDepth, // 预加载三层评论
        likedCommentIds.has(c.id),
      ),
    );
  }

  // 计算分页元数据
  const lastComment = slicedComments[slicedComments.length - 1];
  const nextCursor = hasNext ? lastComment?.sortKey : undefined;

  const meta = {
    page: cursor ? 2 : 1,
    pageSize,
    total: data.length,
    totalPages: hasNext ? 2 : 1,
    hasNext,
    hasPrev: !!cursor,
    nextCursor,
  };

  return response.ok({
    data: data as unknown as DirectChildrenResponse["data"],
    meta,
  });
}

export async function createComment(
  params: CreateComment,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CommentItem | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "createComment"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, CreateCommentSchema);
  if (validationError) return response.badRequest(validationError);

  const captchaResult = await ensureCaptcha(params.captcha_token);
  if (!captchaResult?.success) {
    return response.badRequest({ message: "安全验证失败，请重试" });
  }

  const {
    slug,
    content,
    parentId,
    authorName,
    authorEmail,
    authorWebsite,
    access_token,
  } = params;

  const commentEnabled = await getConfig<boolean>("comment.enable", true);
  if (!commentEnabled) {
    return response.forbidden({ message: "评论功能已关闭" });
  }

  const [
    allowAnonymous,
    requireAnonEmail,
    allowAnonWebsite,
    reviewAll,
    reviewAnon,
  ] = await Promise.all([
    getConfig<boolean>("comment.anonymous.enable", true),
    getConfig<boolean>("comment.anonymous.email.required", true),
    getConfig<boolean>("comment.anonymous.website.enable", true),
    getConfig<boolean>("comment.review.enable", false),
    getConfig<boolean>("comment.anonymous.review.enable", false),
  ]);

  const post = await loadPostId(slug);
  if (!post) return response.notFound({ message: "文章不存在或未发布" });
  if (!post.allowComments) {
    return response.forbidden({ message: "该文章未开启评论" });
  }

  const authUser = await authVerify({
    allowedRoles: COMMENT_ROLES,
    accessToken: access_token,
  });
  const currentUid = authUser?.uid ?? null;

  if (!currentUid && !allowAnonymous) {
    return response.unauthorized({ message: "请登录后再评论" });
  }

  if (!currentUid && requireAnonEmail && !authorEmail) {
    return response.badRequest({ message: "请填写邮箱后再提交评论" });
  }

  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId, deletedAt: null },
      select: { postId: true, depth: true, path: true, sortKey: true },
    });
    if (!parentComment || parentComment.postId !== post.id) {
      return response.badRequest({ message: "回复目标不存在" });
    }
  }

  const status: CommentStatus =
    reviewAll || (!currentUid && reviewAnon) ? "PENDING" : "APPROVED";

  const ipAddress = await getClientIP();

  const dbUser = currentUid
    ? await prisma.user.findUnique({
        where: { uid: currentUid },
        select: {
          uid: true,
          username: true,
          nickname: true,
          email: true,
          avatar: true,
          website: true,
        },
      })
    : null;

  // 计算层级树形结构字段
  let depth = 0;
  let path = "";
  let sortKey = "";

  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { depth: true, path: true, sortKey: true, replyCount: true },
    });
    if (parentComment) {
      depth = parentComment.depth + 1;
      // sortKey 基于父评论的 sortKey + 兄弟数量
      const siblingIndex = parentComment.replyCount + 1;
      sortKey = `${parentComment.sortKey}.${String(siblingIndex).padStart(4, "0")}`;
    }
  } else {
    // 顶级评论：计算当前文章的顶级评论数量
    const rootCount = await prisma.comment.count({
      where: { postId: post.id, parentId: null },
    });
    sortKey = String(rootCount + 1).padStart(4, "0");
  }

  const record = await prisma.comment.create({
    data: {
      content,
      status,
      parentId: parentId || null,
      postId: post.id,
      userUid: dbUser?.uid ?? null,
      authorName: dbUser?.nickname || dbUser?.username || authorName || "匿名",
      authorEmail: dbUser?.email || authorEmail || null,
      authorWebsite:
        dbUser?.website || (allowAnonWebsite ? authorWebsite || null : null),
      ipAddress,
      depth,
      path: "", // 先创建记录，稍后更新 path
      sortKey,
      replyCount: 0,
    },
    select: { id: true },
  });

  // 更新 path（需要包含自身 id）
  if (parentId) {
    const parentComment = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { path: true },
    });
    path = parentComment?.path
      ? `${parentComment.path}/${record.id}`
      : `${parentId}/${record.id}`;
  } else {
    path = record.id;
  }

  // 更新评论的 path
  await prisma.comment.update({
    where: { id: record.id },
    data: { path },
  });

  // 更新父评论的 replyCount
  if (parentId) {
    await prisma.comment.update({
      where: { id: parentId },
      data: { replyCount: { increment: 1 } },
    });
  }

  // 重新获取完整记录
  const fullRecord = await prisma.comment.findUnique({
    where: { id: record.id },
    select: commentSelect,
  });

  if (!fullRecord) {
    return response.serverError();
  }

  const showLocation = await getConfig<boolean>("comment.locate.enable", false);

  // 新创建的评论，当前用户肯定没有点赞
  const mapped = await mapCommentToItem(
    fullRecord,
    currentUid,
    showLocation,
    undefined,
    false,
  );

  return response.created({ data: mapped as unknown as CommentItem });
}

export async function updateCommentStatus(
  params: UpdateCommentStatus,
  serverConfig?: ActionConfig,
): Promise<ActionResult<null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "updateCommentStatus"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, UpdateCommentStatusSchema);
  if (validationError) return response.badRequest(validationError);

  const authUser = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
  });
  if (!authUser) return response.unauthorized();

  const { ids, status } = params;

  await prisma.comment.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { status },
  });

  return response.ok({ message: "更新成功" });
}

export async function deleteComments(
  params: DeleteComments,
  serverConfig?: ActionConfig,
): Promise<ActionResult<null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "deleteComments"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, DeleteCommentsSchema);
  if (validationError) return response.badRequest(validationError);

  const authUser = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
  });
  if (!authUser) return response.unauthorized();

  const { ids } = params;

  await prisma.comment.updateMany({
    where: { id: { in: ids }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  return response.ok({ message: "删除成功" });
}

export async function getCommentsAdmin(
  params: GetCommentsAdmin,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CommentsAdminListResponse["data"] | null>>>;
export async function getCommentsAdmin(
  params: GetCommentsAdmin,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CommentsAdminListResponse["data"] | null>>;
export async function getCommentsAdmin(
  params: GetCommentsAdmin,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CommentsAdminListResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCommentsAdmin"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetCommentsAdminSchema);
  if (validationError) return response.badRequest(validationError);

  const authUser = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
  });
  if (!authUser) return response.unauthorized();

  const {
    page = 1,
    pageSize = 25,
    sortBy = "createdAt",
    sortOrder = "desc",
    status,
    slug,
    uid,
    search,
    parentOnly,
  } = params;

  const where: Prisma.CommentWhereInput = {
    deletedAt: null,
    ...(slug ? { post: { slug } } : {}),
    ...(uid ? { userUid: uid } : {}),
    ...(parentOnly ? { parentId: null } : {}),
    ...(status?.length ? { status: { in: status } } : {}),
  };

  if (search) {
    where.OR = [
      { content: { contains: search } },
      { authorName: { contains: search } },
      { authorEmail: { contains: search } },
      { authorWebsite: { contains: search } },
      { user: { username: { contains: search } } },
      { user: { nickname: { contains: search } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: adminCommentSelect,
    }),
  ]);

  const meta = buildPaginationMeta({
    page,
    pageSize,
    total,
    hasNext: page * pageSize < total,
  });

  // 批量查询点赞状态
  let likedCommentIds: Set<string> = new Set();
  if (rows.length > 0) {
    const commentIds = rows.map((r) => r.id);
    const likes = await prisma.commentLike.findMany({
      where: {
        commentId: { in: commentIds },
        userId: authUser.uid,
      },
      select: { commentId: true },
    });
    likedCommentIds = new Set(likes.map((like) => like.commentId));
  }

  const data = await Promise.all(
    rows.map(async (row) => {
      const mapped = await mapCommentToItem(
        row as AdminComment,
        authUser.uid,
        true,
        undefined,
        likedCommentIds.has(row.id),
      );
      return {
        ...mapped,
        email: row.authorEmail,
        ipAddress: row.ipAddress,
      };
    }),
  );

  return response.ok({
    data: data as unknown as CommentsAdminListResponse["data"],
    meta,
  });
}

export async function getCommentHistory(
  params: GetCommentHistory,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CommentHistoryPoint[] | null>>>;
export async function getCommentHistory(
  params: GetCommentHistory,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CommentHistoryPoint[] | null>>;
export async function getCommentHistory(
  params: GetCommentHistory,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CommentHistoryPoint[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCommentHistory"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetCommentHistorySchema);
  if (validationError) return response.badRequest(validationError);

  const authUser = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: params.access_token,
  });
  if (!authUser) return response.unauthorized();

  const now = new Date();
  const since = new Date(now.getTime() - params.days * 24 * 60 * 60 * 1000);

  const rows = await prisma.comment.findMany({
    where: { createdAt: { gte: since }, deletedAt: null },
    select: {
      createdAt: true,
      status: true,
      post: { select: { slug: true, title: true } },
    },
  });

  const bucket = new Map<
    string,
    {
      total: number;
      approved: number;
      pending: number;
      posts: Map<string, number>;
    }
  >();
  const slugTitleMap = new Map<string, string | null>();

  rows.forEach((row) => {
    const dateStr = row.createdAt.toISOString().slice(0, 10);
    const item = bucket.get(dateStr) || {
      total: 0,
      approved: 0,
      pending: 0,
      posts: new Map<string, number>(),
    };

    if (row.post?.slug) {
      const slug = row.post.slug;
      slugTitleMap.set(slug, row.post.title ?? null);
      item.posts.set(slug, (item.posts.get(slug) || 0) + 1);
    }

    item.total += 1;
    if (row.status === "APPROVED") item.approved += 1;
    if (row.status === "PENDING") item.pending += 1;
    bucket.set(dateStr, item);
  });

  const data: CommentHistoryPoint[] = [];
  for (let i = params.days - 1; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().slice(0, 10);
    const item = bucket.get(dateStr) || {
      total: 0,
      approved: 0,
      pending: 0,
      posts: new Map<string, number>(),
    };
    data.push({
      date: dateStr,
      total: item.total,
      approved: item.approved,
      pending: item.pending,
      posts: Array.from(item.posts.entries()).map(([slug, count]) => ({
        slug,
        title: slugTitleMap.get(slug) ?? null,
        count,
      })),
    });
  }

  return response.ok({ data });
}

export async function getCommentStats(
  params: GetCommentStats,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CommentStats | null>>>;
export async function getCommentStats(
  params: GetCommentStats,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CommentStats | null>>;
export async function getCommentStats(
  { access_token, force }: GetCommentStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CommentStats | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCommentStats"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    { access_token, force },
    GetCommentStatsSchema,
  );
  if (validationError) return response.badRequest(validationError);

  const authUser = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });
  if (!authUser) return response.unauthorized();

  try {
    const CACHE_KEY = generateCacheKey("stats", "comments");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<CommentStats>(CACHE_KEY, {
        ttl: CACHE_TTL,
      });

      if (cachedData) {
        return response.ok({
          data: cachedData,
        });
      }
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      total,
      approved,
      pending,
      rejected,
      spam,
      latest,
      newLastDay,
      newLast7Days,
      newLast30Days,
    ] = await Promise.all([
      prisma.comment.count({ where: { deletedAt: null } }),
      prisma.comment.count({ where: { status: "APPROVED", deletedAt: null } }),
      prisma.comment.count({ where: { status: "PENDING", deletedAt: null } }),
      prisma.comment.count({ where: { status: "REJECTED", deletedAt: null } }),
      prisma.comment.count({ where: { status: "SPAM", deletedAt: null } }),
      prisma.comment.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.comment.count({
        where: { createdAt: { gte: oneDayAgo }, deletedAt: null },
      }),
      prisma.comment.count({
        where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null },
      }),
      prisma.comment.count({
        where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
      }),
    ]);

    const data: CommentStats = {
      updatedAt: now.toISOString(),
      cache: false,
      total,
      approved,
      pending,
      rejected,
      spam,
      lastCommentAt: latest?.createdAt?.toISOString() ?? null,
      new: {
        lastDay: newLastDay,
        last7Days: newLast7Days,
        last30Days: newLast30Days,
      },
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({ data });
  } catch (error) {
    console.error("GetCommentStats error:", error);
    return response.serverError();
  }
}

// 点赞评论
export async function likeComment(
  params: LikeComment,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<LikeCommentResponse["data"] | null>>>;
export async function likeComment(
  params: LikeComment,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<LikeCommentResponse["data"] | null>>;
export async function likeComment(
  params: LikeComment,
  serverConfig?: ActionConfig,
): Promise<ActionResult<LikeCommentResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "likeComment"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, LikeCommentSchema);
  if (validationError) return response.badRequest(validationError);

  // 必须登录
  const authUser = await authVerify({ allowedRoles: COMMENT_ROLES });
  if (!authUser) {
    return response.unauthorized({ message: "请登录后再点赞" });
  }

  const { commentId } = params;

  // 检查评论是否存在
  const comment = await prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
    select: { id: true },
  });

  if (!comment) {
    return response.notFound({ message: "评论不存在" });
  }

  try {
    // 使用事务确保原子性
    const result = await prisma.$transaction(async (tx) => {
      // 检查是否已点赞
      const existingLike = await tx.commentLike.findUnique({
        where: {
          commentId_userId: {
            commentId,
            userId: authUser.uid,
          },
        },
      });

      if (existingLike) {
        // 已点赞，返回当前状态
        const comment = await tx.comment.findUnique({
          where: { id: commentId },
          select: { likeCount: true },
        });
        return {
          likeCount: comment?.likeCount ?? 0,
          isLiked: true,
        };
      }

      // 创建点赞记录并更新点赞数
      await tx.commentLike.create({
        data: {
          commentId,
          userId: authUser.uid,
        },
      });

      const updatedComment = await tx.comment.update({
        where: { id: commentId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      });

      return {
        likeCount: updatedComment.likeCount,
        isLiked: true,
      };
    });

    return response.ok({ data: result });
  } catch (error) {
    console.error("LikeComment error:", error);
    return response.serverError({ message: "点赞失败，请稍后重试" });
  }
}

// 取消点赞评论
export async function unlikeComment(
  params: UnlikeComment,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<UnlikeCommentResponse["data"] | null>>>;
export async function unlikeComment(
  params: UnlikeComment,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<UnlikeCommentResponse["data"] | null>>;
export async function unlikeComment(
  params: UnlikeComment,
  serverConfig?: ActionConfig,
): Promise<ActionResult<UnlikeCommentResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "unlikeComment"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, UnlikeCommentSchema);
  if (validationError) return response.badRequest(validationError);

  // 必须登录
  const authUser = await authVerify({ allowedRoles: COMMENT_ROLES });
  if (!authUser) {
    return response.unauthorized({ message: "请登录后再操作" });
  }

  const { commentId } = params;

  try {
    // 使用事务确保原子性
    const result = await prisma.$transaction(async (tx) => {
      // 检查是否已点赞
      const existingLike = await tx.commentLike.findUnique({
        where: {
          commentId_userId: {
            commentId,
            userId: authUser.uid,
          },
        },
      });

      if (!existingLike) {
        // 未点赞，返回当前状态
        const comment = await tx.comment.findUnique({
          where: { id: commentId },
          select: { likeCount: true },
        });
        return {
          likeCount: comment?.likeCount ?? 0,
          isLiked: false,
        };
      }

      // 删除点赞记录并更新点赞数
      await tx.commentLike.delete({
        where: {
          commentId_userId: {
            commentId,
            userId: authUser.uid,
          },
        },
      });

      const updatedComment = await tx.comment.update({
        where: { id: commentId },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      });

      return {
        likeCount: updatedComment.likeCount,
        isLiked: false,
      };
    });

    return response.ok({ data: result });
  } catch (error) {
    console.error("UnlikeComment error:", error);
    return response.serverError({ message: "取消点赞失败，请稍后重试" });
  }
}

// 删除自己的评论
export async function deleteOwnComment(
  params: DeleteOwnComment,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DeleteOwnCommentResponse["data"] | null>>>;
export async function deleteOwnComment(
  params: DeleteOwnComment,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DeleteOwnCommentResponse["data"] | null>>;
export async function deleteOwnComment(
  params: DeleteOwnComment,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DeleteOwnCommentResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "deleteOwnComment"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, DeleteOwnCommentSchema);
  if (validationError) return response.badRequest(validationError);

  // 必须登录
  const authUser = await authVerify({ allowedRoles: COMMENT_ROLES });
  if (!authUser) {
    return response.unauthorized({ message: "请登录后再操作" });
  }

  const { commentId } = params;

  // 检查评论是否存在且是当前用户的评论
  const comment = await prisma.comment.findUnique({
    where: { id: commentId, deletedAt: null },
    select: { id: true, userUid: true },
  });

  if (!comment) {
    return response.notFound({ message: "评论不存在" });
  }

  // 验证是评论的作者
  if (comment.userUid !== authUser.uid) {
    return response.forbidden({ message: "只能删除自己的评论" });
  }

  try {
    // 软删除评论
    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return response.ok({ data: null, message: "评论已删除" });
  } catch (error) {
    console.error("DeleteOwnComment error:", error);
    return response.serverError({ message: "删除失败，请稍后重试" });
  }
}
