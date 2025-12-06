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
} from "@repo/shared-types/api/comment";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { validateData } from "@/lib/server/validator";
import { authVerify } from "@/lib/server/auth-verify";
import { getClientIP } from "@/lib/server/getClientInfo";
import { resolveIpLocation } from "@/lib/server/ip-utils";
import { verifyToken } from "./captcha";
import { getConfig } from "@/lib/server/configCache";
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

  // 判断是否有未加载的深层子评论
  const hasMore =
    maxDepth !== undefined &&
    comment.replyCount > 0 &&
    comment.depth >= maxDepth - 1;

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

  const { slug, pageSize, maxDepth, cursor } = params;

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

  // 1. 首先获取顶级评论（分页）
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

  const [rootComments, showLocation] = await Promise.all([
    prisma.comment.findMany({
      where: rootWhere,
      orderBy: { sortKey: "asc" },
      take: pageSize + 1,
      select: commentSelect,
    }),
    getConfig<boolean>("comment.locate.enable", false),
  ]);

  const hasNext = rootComments.length > pageSize;
  const slicedRoots = rootComments.slice(0, pageSize);

  if (slicedRoots.length === 0) {
    return response.ok({
      data: [] as unknown as CommentListResponse["data"],
      meta: {
        page: 1,
        pageSize,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    });
  }

  // 2. 获取这些顶级评论下 depth < maxDepth 的所有子评论
  const rootIds = slicedRoots.map((c) => c.id);
  const pathPatterns = rootIds.map((id) => `${id}%`);

  // 构建 OR 条件查询所有子评论
  const childrenWhere: Prisma.CommentWhereInput = {
    postId: post.id,
    deletedAt: null,
    depth: { gt: 0, lt: maxDepth }, // depth 1 到 maxDepth-1
    OR: [
      { status: "APPROVED" },
      ...(currentUid ? [{ userUid: currentUid }] : []),
    ],
    AND: [
      {
        OR: pathPatterns.map((pattern) => ({
          path: { startsWith: pattern.replace("%", "") },
        })),
      },
    ],
  };

  const childComments = await prisma.comment.findMany({
    where: childrenWhere,
    orderBy: { sortKey: "asc" },
    select: commentSelect,
  });

  // 3. 合并并按 sortKey 排序
  const allComments = [...slicedRoots, ...childComments].sort((a, b) =>
    a.sortKey.localeCompare(b.sortKey),
  );

  // 4. 转换为响应格式
  const data: CommentItem[] = [];
  for (const c of allComments) {
    data.push(await mapCommentToItem(c, currentUid, showLocation, maxDepth));
  }

  // 5. 计算分页元数据
  const lastRoot = slicedRoots[slicedRoots.length - 1];
  const nextCursor = hasNext ? lastRoot?.sortKey : undefined;

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

    chain.unshift(await mapCommentToItem(comment, currentUid, showLocation));
    currentId = comment.parentId;
    guard += 1;
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

  const data: CommentItem[] = [];
  for (const c of rawComments) {
    data.push(
      await mapCommentToItem(c, currentUid, showLocation, maxAbsoluteDepth),
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
  const mapped = await mapCommentToItem(fullRecord, currentUid, showLocation);

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

  const data = await Promise.all(
    rows.map(async (row) => {
      const mapped = await mapCommentToItem(
        row as AdminComment,
        authUser.uid,
        true,
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
