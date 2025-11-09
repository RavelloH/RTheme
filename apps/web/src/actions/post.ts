"use server";
import { NextResponse } from "next/server";
import {
  GetPostsTrendsSchema,
  GetPostsTrends,
  PostTrendItem,
  GetPostsListSchema,
  GetPostsList,
  PostListItem,
  GetPostDetailSchema,
  GetPostDetail,
  PostDetail,
  CreatePostSchema,
  CreatePost,
  CreatePostResult,
  UpdatePostSchema,
  UpdatePost,
  UpdatePostResult,
  UpdatePostsSchema,
  UpdatePosts,
  DeletePostsSchema,
  DeletePosts,
  GetPostHistorySchema,
  GetPostHistory,
  PostHistoryItem,
  PostHistoryWithStats,
  PostHistoryStats,
  GetPostVersionSchema,
  GetPostVersion,
  PostVersionDetail,
  ResetPostToVersionSchema,
  ResetPostToVersion,
  ResetPostToVersionResult,
  SquashPostToVersionSchema,
  SquashPostToVersion,
  SquashPostToVersionResult,
} from "@repo/shared-types/api/post";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "./audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/getClientInfo";
import { TextVersion } from "text-version";

/*
  辅助函数：解析版本名称
  格式: "userUid:ISO时间:提交信息"
  例如: "1:2025-01-09T12:55:38.259Z:初始版本"
*/
function parseVersionName(versionStr: string): {
  userUid: number;
  timestamp: string;
  commitMessage: string;
} {
  // 找到第一个冒号，分隔 userUid
  const firstColonIndex = versionStr.indexOf(":");
  if (firstColonIndex === -1) {
    throw new Error(`Invalid version format: ${versionStr}`);
  }

  const userUidStr = versionStr.substring(0, firstColonIndex);
  const rest = versionStr.substring(firstColonIndex + 1);

  // 找到 ISO 时间结束的位置（通常是 Z: 或 +XX:XX: 之后）
  // ISO 8601 格式以 Z 或 +/-HH:MM 结尾
  let timestampEndIndex = -1;

  // 查找 Z: 模式（UTC 时间）
  const zIndex = rest.indexOf("Z:");
  if (zIndex !== -1) {
    timestampEndIndex = zIndex + 1; // 包含 Z
  } else {
    // 查找时区偏移模式（+08:00: 或 -05:00:）
    const timezoneMatch = rest.match(/[+-]\d{2}:\d{2}:/);
    if (timezoneMatch && timezoneMatch.index !== undefined) {
      timestampEndIndex = timezoneMatch.index + timezoneMatch[0].length - 1;
    }
  }

  if (timestampEndIndex === -1) {
    throw new Error(`Invalid version format (timestamp): ${versionStr}`);
  }

  const timestamp = rest.substring(0, timestampEndIndex);
  const commitMessage = rest.substring(timestampEndIndex + 1); // +1 跳过冒号

  if (!userUidStr || !timestamp) {
    throw new Error(`Invalid version format: ${versionStr}`);
  }

  const userUid = parseInt(userUidStr, 10);

  if (isNaN(userUid)) {
    throw new Error(`Invalid userUid in version: ${versionStr}`);
  }

  return { userUid, timestamp, commitMessage };
}

/*
  辅助函数：根据 timestamp 查找版本
*/
function findVersionByTimestamp(
  versionLog: Array<{ version: string; isSnapshot: boolean }>,
  timestamp: string,
): { version: string; isSnapshot: boolean } | undefined {
  return versionLog.find((v) => {
    try {
      const parsed = parseVersionName(v.version);
      return parsed.timestamp === timestamp;
    } catch {
      return false;
    }
  });
}

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/*
  getPostsTrends - 获取文章趋势数据
*/
export async function getPostsTrends(
  params: GetPostsTrends,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<PostTrendItem[] | null>>>;
export async function getPostsTrends(
  params: GetPostsTrends,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<PostTrendItem[] | null>>;
export async function getPostsTrends(
  { access_token, days = 365, count = 30 }: GetPostsTrends,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostTrendItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      days,
      count,
    },
    GetPostsTrendsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 查询最近 count 篇文章的最早创建时间
    const recentPosts = await prisma.post.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: count,
      select: {
        createdAt: true,
      },
    });

    // 确定实际的起始时间：取 daysAgo 和最近 count 篇文章中最早的时间
    let startDate = daysAgo;
    if (recentPosts.length === count) {
      const oldestRecentPost = recentPosts[recentPosts.length - 1];
      if (oldestRecentPost && oldestRecentPost.createdAt < daysAgo) {
        // 如果最近 count 篇文章的时间跨度超过 days 天，扩展起始时间
        startDate = oldestRecentPost.createdAt;
      }
    }

    // 计算时间跨度（天数）
    const actualDays = Math.ceil(
      (now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );

    // 生成每日数据点
    const datePoints: Date[] = [];
    for (let i = 0; i <= actualDays; i++) {
      datePoints.push(new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000));
    }

    // 为每个时间点计算统计数据
    const allTrendData: PostTrendItem[] = await Promise.all(
      datePoints.map(async (date, index) => {
        // 前一个数据点的时间
        const prevDate =
          index > 0
            ? datePoints[index - 1]
            : new Date(date.getTime() - 24 * 60 * 60 * 1000);

        // total: 全站文章总数
        // personal: 当前用户的文章数
        // new: 全站新增文章数（相比上一个数据点）
        const [totalPosts, myPosts, newPosts] = await Promise.all([
          // 截止该时间点的总文章数（全站）
          prisma.post.count({
            where: {
              createdAt: { lte: date },
              deletedAt: null,
            },
          }),
          // 截止该时间点当前用户的文章数
          prisma.post.count({
            where: {
              createdAt: { lte: date },
              deletedAt: null,
              userUid: user.uid,
            },
          }),
          // 自上一个数据点以来新增的文章数（全站）
          prisma.post.count({
            where: {
              createdAt: {
                gt: prevDate,
                lte: date,
              },
              deletedAt: null,
            },
          }),
        ]);

        return {
          time: date.toISOString(),
          data: {
            total: totalPosts,
            personal: myPosts,
            new: newPosts,
          },
        };
      }),
    );

    // 直接返回所有数据点，不进行过滤
    return response.ok({ data: allTrendData });
  } catch (error) {
    console.error("Get posts trends error:", error);
    return response.serverError();
  }
}

/*
  getPostsList - 获取文章列表
*/
export async function getPostsList(
  params: GetPostsList,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<PostListItem[] | null>>>;
export async function getPostsList(
  params: GetPostsList,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<PostListItem[] | null>>;
export async function getPostsList(
  {
    access_token,
    page = 1,
    pageSize = 25,
    sortBy = "id",
    sortOrder = "desc",
    status,
    search,
  }: GetPostsList,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostListItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      page,
      pageSize,
      sortBy,
      sortOrder,
      status,
      search,
    },
    GetPostsListSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 计算偏移量
    const skip = (page - 1) * pageSize;

    // 构建 where 条件
    const where: {
      deletedAt: null;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      userUid?: number; // AUTHOR 只能看到自己的文章
      OR?: Array<{
        title?: { contains: string; mode: "insensitive" };
        slug?: { contains: string; mode: "insensitive" };
        excerpt?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      deletedAt: null, // 只获取未删除的文章
    };

    // AUTHOR 只能查看自己的文章
    if (user.role === "AUTHOR") {
      where.userUid = user.uid;
    }

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { slug: { contains: search.trim(), mode: "insensitive" } },
        { excerpt: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // 获取总数
    const total = await prisma.post.count({ where });

    // 构建排序条件
    const orderBy = { [sortBy]: sortOrder };

    // 获取分页数据
    const posts = await prisma.post.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        isPinned: true,
        allowComments: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        featuredImage: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        robotsIndex: true,
        postMode: true,
        author: {
          select: {
            uid: true,
            username: true,
            nickname: true,
          },
        },
        categories: {
          select: {
            name: true,
          },
        },
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    // 转换数据格式
    const data: PostListItem[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      isPinned: post.isPinned,
      allowComments: post.allowComments,
      publishedAt: post.publishedAt?.toISOString() || null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      featuredImage: post.featuredImage,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      metaKeywords: post.metaKeywords,
      robotsIndex: post.robotsIndex,
      postMode: post.postMode,
      author: {
        uid: post.author.uid,
        username: post.author.username,
        nickname: post.author.nickname,
      },
      categories: post.categories.map((cat) => cat.name),
      tags: post.tags.map((tag) => tag.name),
    }));

    // 计算分页元数据
    const totalPages = Math.ceil(total / pageSize);
    const meta = {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return response.ok({
      data,
      meta,
    });
  } catch (error) {
    console.error("Get posts list error:", error);
    return response.serverError();
  }
}

/*
  getPostDetail - 获取文章详情
*/
export async function getPostDetail(
  params: GetPostDetail,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<PostDetail | null>>>;
export async function getPostDetail(
  params: GetPostDetail,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<PostDetail | null>>;
export async function getPostDetail(
  { access_token, slug }: GetPostDetail,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostDetail | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      slug,
    },
    GetPostDetailSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 查找文章
    const post = await prisma.post.findUnique({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        status: true,
        isPinned: true,
        allowComments: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        featuredImage: true,
        metaTitle: true,
        metaDescription: true,
        metaKeywords: true,
        robotsIndex: true,
        postMode: true,
        userUid: true, // 需要获取作者 uid 以进行权限检查
        author: {
          select: {
            uid: true,
            username: true,
            nickname: true,
          },
        },
        categories: {
          select: {
            name: true,
          },
        },
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!post) {
      return response.notFound({ message: "文章不存在" });
    }

    // AUTHOR 只能查看自己的文章
    if (user.role === "AUTHOR" && post.userUid !== user.uid) {
      return response.forbidden({ message: "无权访问此文章" });
    }

    // 使用 text-version 获取最新版本的内容
    const tv = new TextVersion();
    const latestContent = tv.latest(post.content);

    // 转换数据格式
    const data: PostDetail = {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: latestContent,
      excerpt: post.excerpt,
      status: post.status,
      isPinned: post.isPinned,
      allowComments: post.allowComments,
      publishedAt: post.publishedAt?.toISOString() || null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      featuredImage: post.featuredImage,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      metaKeywords: post.metaKeywords,
      robotsIndex: post.robotsIndex,
      postMode: post.postMode,
      author: {
        uid: post.author.uid,
        username: post.author.username,
        nickname: post.author.nickname,
      },
      categories: post.categories.map((cat) => cat.name),
      tags: post.tags.map((tag) => tag.name),
    };

    return response.ok({ data });
  } catch (error) {
    console.error("Get post detail error:", error);
    return response.serverError();
  }
}

/*
  createPost - 新建文章
*/
export async function createPost(
  params: CreatePost,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CreatePostResult | null>>>;
export async function createPost(
  params: CreatePost,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CreatePostResult | null>>;
export async function createPost(
  {
    access_token,
    title,
    slug,
    content,
    excerpt,
    featuredImage,
    status = "DRAFT",
    isPinned = false,
    allowComments = true,
    publishedAt,
    metaTitle,
    metaDescription,
    metaKeywords,
    robotsIndex = true,
    categories,
    tags,
    commitMessage,
    postMode = "MARKDOWN",
  }: CreatePost,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CreatePostResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      status,
      isPinned,
      allowComments,
      publishedAt,
      metaTitle,
      metaDescription,
      metaKeywords,
      robotsIndex,
      categories,
      tags,
      commitMessage,
      postMode,
    },
    CreatePostSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 检查 slug 是否已存在
    const existingPost = await prisma.post.findUnique({
      where: { slug },
    });

    if (existingPost) {
      return response.badRequest({ message: "该 slug 已被使用" });
    }

    // 使用 text-version 创建内容版本
    const tv = new TextVersion();
    const now = new Date().toISOString();
    // 如果没有提供 commitMessage，使用默认值
    const finalCommitMessage = commitMessage || "初始版本";
    const versionName = `${user.uid}:${now}:${finalCommitMessage}`;
    const versionedContent = tv.commit("", content, versionName);

    // 处理发布时间：如果状态是 PUBLISHED 且没有提供 publishedAt，则使用当前时间
    let publishedAtDate: Date | null = null;
    if (status === "PUBLISHED") {
      publishedAtDate = publishedAt ? new Date(publishedAt) : new Date();
    } else if (publishedAt) {
      // 如果不是 PUBLISHED 状态但提供了 publishedAt，也保存它
      publishedAtDate = new Date(publishedAt);
    }

    // 创建文章
    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: versionedContent,
        excerpt: excerpt || null,
        featuredImage: featuredImage || null,
        status,
        isPinned,
        allowComments,
        publishedAt: publishedAtDate,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        metaKeywords: metaKeywords || null,
        robotsIndex,
        postMode,
        userUid: user.uid,
        categories:
          categories && categories.length > 0
            ? {
                connectOrCreate: categories.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              }
            : undefined,
        tags:
          tags && tags.length > 0
            ? {
                connectOrCreate: tags.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              }
            : undefined,
      },
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "CREATE",
        resourceType: "POST",
        resourceId: String(post.id),
        vaule: {
          old: null,
          new: {
            title,
            slug,
            status,
            commitMessage,
          },
        },
        description: `创建文章: ${title}`,
        metadata: {
          postId: post.id,
          slug: post.slug,
        },
      },
    });

    return response.ok({
      data: {
        id: post.id,
        slug: post.slug,
      },
    });
  } catch (error) {
    console.error("Create post error:", error);
    return response.serverError();
  }
}

/*
  updatePost - 更新文章
*/
export async function updatePost(
  params: UpdatePost,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<UpdatePostResult | null>>>;
export async function updatePost(
  params: UpdatePost,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<UpdatePostResult | null>>;
export async function updatePost(
  {
    access_token,
    slug,
    newSlug,
    title,
    content,
    excerpt,
    featuredImage,
    status,
    isPinned,
    allowComments,
    publishedAt,
    metaTitle,
    metaDescription,
    metaKeywords,
    robotsIndex,
    categories,
    tags,
    commitMessage,
    postMode,
  }: UpdatePost,
  serverConfig?: ActionConfig,
): Promise<ActionResult<UpdatePostResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      slug,
      newSlug,
      title,
      content,
      excerpt,
      featuredImage,
      status,
      isPinned,
      allowComments,
      publishedAt,
      metaTitle,
      metaDescription,
      metaKeywords,
      robotsIndex,
      categories,
      tags,
      commitMessage,
      postMode,
    },
    UpdatePostSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 查找要更新的文章
    const existingPost = await prisma.post.findUnique({
      where: { slug, deletedAt: null },
      select: {
        id: true,
        content: true,
        status: true,
        publishedAt: true,
        userUid: true, // 需要获取作者 uid 以进行权限检查
        categories: { select: { name: true } },
        tags: { select: { name: true } },
      },
    });

    if (!existingPost) {
      return response.notFound({ message: "文章不存在" });
    }

    // AUTHOR 只能更新自己的文章
    if (user.role === "AUTHOR" && existingPost.userUid !== user.uid) {
      return response.forbidden({ message: "无权修改此文章" });
    }

    // 如果要修改 slug，检查新 slug 是否已被占用
    if (newSlug && newSlug !== slug) {
      const slugExists = await prisma.post.findUnique({
        where: { slug: newSlug },
      });

      if (slugExists) {
        return response.badRequest({ message: "新的 slug 已被使用" });
      }
    }

    // 使用 text-version 处理内容版本
    let versionedContent = existingPost.content;
    if (content !== undefined) {
      const tv = new TextVersion();
      const now = new Date().toISOString();
      const finalCommitMessage = commitMessage || "更新内容";
      const versionName = `${user.uid}:${now}:${finalCommitMessage}`;
      versionedContent = tv.commit(existingPost.content, content, versionName);
    }

    // 构建更新数据
    const updateData: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string | null;
      featuredImage?: string | null;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      isPinned?: boolean;
      allowComments?: boolean;
      publishedAt?: Date | null;
      metaTitle?: string | null;
      metaDescription?: string | null;
      metaKeywords?: string | null;
      robotsIndex?: boolean;
      postMode?: "MARKDOWN" | "MDX";
    } = {};

    if (title !== undefined) updateData.title = title;
    if (newSlug !== undefined) updateData.slug = newSlug;
    if (content !== undefined) updateData.content = versionedContent;
    if (excerpt !== undefined) updateData.excerpt = excerpt || null;
    if (featuredImage !== undefined)
      updateData.featuredImage = featuredImage || null;
    if (status !== undefined) updateData.status = status;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (allowComments !== undefined) updateData.allowComments = allowComments;
    if (postMode !== undefined) updateData.postMode = postMode;

    // 处理发布时间的逻辑
    if (status !== undefined) {
      if (status === "PUBLISHED") {
        // 如果状态改为 PUBLISHED
        if (!existingPost.publishedAt) {
          // 如果之前没有发布时间，设置为当前时间或提供的时间
          updateData.publishedAt = publishedAt
            ? new Date(publishedAt)
            : new Date();
        } else if (publishedAt !== undefined) {
          // 如果之前有发布时间，但提供了新的发布时间，使用新的
          updateData.publishedAt = publishedAt
            ? new Date(publishedAt)
            : existingPost.publishedAt;
        }
        // 否则保持原有的 publishedAt 不变
      } else {
        // 如果状态改为 DRAFT 或 ARCHIVED
        if (publishedAt !== undefined) {
          // 如果明确提供了 publishedAt，使用它
          updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
        }
        // 否则保持原有的 publishedAt 不变
      }
    } else if (publishedAt !== undefined) {
      // 如果只是修改 publishedAt 而没有修改 status
      updateData.publishedAt = publishedAt ? new Date(publishedAt) : null;
    }

    if (metaTitle !== undefined) updateData.metaTitle = metaTitle || null;
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription || null;
    if (metaKeywords !== undefined)
      updateData.metaKeywords = metaKeywords || null;
    if (robotsIndex !== undefined) updateData.robotsIndex = robotsIndex;

    // 更新文章
    const updatedPost = await prisma.post.update({
      where: { id: existingPost.id },
      data: {
        ...updateData,
        // 处理分类
        ...(categories !== undefined && {
          categories: {
            set: [], // 先清空所有关联
            connectOrCreate: categories.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
        }),
        // 处理标签
        ...(tags !== undefined && {
          tags: {
            set: [], // 先清空所有关联
            connectOrCreate: tags.map((name) => ({
              where: { name },
              create: { name },
            })),
          },
        }),
      },
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "UPDATE",
        resourceType: "POST",
        resourceId: String(updatedPost.id),
        vaule: {
          old: { slug },
          new: updateData,
        },
        description: `更新文章: ${title || slug}`,
        metadata: {
          postId: updatedPost.id,
          slug: updatedPost.slug,
          ...(commitMessage && { commitMessage }),
        },
      },
    });

    return response.ok({
      data: {
        id: updatedPost.id,
        slug: updatedPost.slug,
      },
    });
  } catch (error) {
    console.error("Update post error:", error);
    return response.serverError();
  }
}

/*
  updatePosts - 批量更新文章
*/
export async function updatePosts(
  params: UpdatePosts,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<{ updated: number } | null>>>;
export async function updatePosts(
  params: UpdatePosts,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ updated: number } | null>>;
export async function updatePosts(
  {
    access_token,
    ids,
    status,
    isPinned,
    allowComments,
    title,
    slug,
    excerpt,
    featuredImage,
    metaTitle,
    metaDescription,
    metaKeywords,
    robotsIndex,
    postMode,
  }: UpdatePosts,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ updated: number } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      ids,
      status,
      isPinned,
      allowComments,
      title,
      slug,
      excerpt,
      featuredImage,
      metaTitle,
      metaDescription,
      metaKeywords,
      robotsIndex,
      postMode,
    },
    UpdatePostsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // AUTHOR 权限：需要验证所有要更新的文章都属于该用户
    if (user.role === "AUTHOR") {
      const postsToUpdate = await prisma.post.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        select: {
          id: true,
          userUid: true,
        },
      });

      // 检查是否所有文章都属于当前用户
      const hasUnauthorizedPost = postsToUpdate.some(
        (post) => post.userUid !== user.uid,
      );

      if (hasUnauthorizedPost) {
        return response.forbidden({ message: "无权修改部分文章" });
      }
    }

    // 构建更新数据
    const updateData: {
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      isPinned?: boolean;
      allowComments?: boolean;
      title?: string;
      slug?: string;
      excerpt?: string;
      featuredImage?: string;
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
      robotsIndex?: boolean;
      publishedAt?: Date;
      postMode?: "MARKDOWN" | "MDX";
    } = {};

    if (status !== undefined) updateData.status = status;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (allowComments !== undefined) updateData.allowComments = allowComments;
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription;
    if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;
    if (robotsIndex !== undefined) updateData.robotsIndex = robotsIndex;
    if (postMode !== undefined) updateData.postMode = postMode;

    // 如果没有要更新的字段
    if (Object.keys(updateData).length === 0) {
      return response.badRequest({ message: "没有要更新的字段" });
    }

    // 如果状态更改为已发布，需要处理 publishedAt
    if (status === "PUBLISHED") {
      // 获取要更新的文章，检查哪些文章还没有 publishedAt
      const whereCondition: {
        id: { in: number[] };
        deletedAt: null;
        userUid?: number;
      } = {
        id: { in: ids },
        deletedAt: null,
      };

      // AUTHOR 只能更新自己的文章
      if (user.role === "AUTHOR") {
        whereCondition.userUid = user.uid;
      }

      const posts = await prisma.post.findMany({
        where: whereCondition,
        select: {
          id: true,
          publishedAt: true,
        },
      });

      // 检查是否所有文章都已有 publishedAt
      const hasUnpublishedPosts = posts.some((post) => !post.publishedAt);

      // 如果有文章没有 publishedAt，则设置为当前时间
      if (hasUnpublishedPosts) {
        updateData.publishedAt = new Date();
      }
    }

    // 执行批量更新
    const updateWhereCondition: {
      id: { in: number[] };
      deletedAt: null;
      userUid?: number;
    } = {
      id: { in: ids },
      deletedAt: null,
    };

    // AUTHOR 只能更新自己的文章
    if (user.role === "AUTHOR") {
      updateWhereCondition.userUid = user.uid;
    }

    const result = await prisma.post.updateMany({
      where: updateWhereCondition,
      data: updateData,
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "UPDATE",
        resourceType: "POST",
        resourceId: ids.join(","),
        vaule: {
          old: null,
          new: updateData,
        },
        description: `批量更新文章: ${ids.length} 篇`,
        metadata: {
          count: result.count,
          idsCount: ids.length,
        },
      },
    });

    return response.ok({
      data: { updated: result.count },
    });
  } catch (error) {
    console.error("Update posts error:", error);
    return response.serverError();
  }
}

/*
  deletePosts - 批量删除文章
*/
export async function deletePosts(
  params: DeletePosts,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<{ deleted: number } | null>>>;
export async function deletePosts(
  params: DeletePosts,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ deleted: number } | null>>;
export async function deletePosts(
  { access_token, ids }: DeletePosts,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ deleted: number } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      ids,
    },
    DeletePostsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // AUTHOR 权限：需要验证所有要删除的文章都属于该用户
    if (user.role === "AUTHOR") {
      const postsToDelete = await prisma.post.findMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        select: {
          id: true,
          userUid: true,
        },
      });

      // 检查是否所有文章都属于当前用户
      const hasUnauthorizedPost = postsToDelete.some(
        (post) => post.userUid !== user.uid,
      );

      if (hasUnauthorizedPost) {
        return response.forbidden({ message: "无权删除部分文章" });
      }
    }

    // 软删除：设置 deletedAt 字段
    const deleteWhereCondition: {
      id: { in: number[] };
      deletedAt: null;
      userUid?: number;
    } = {
      id: { in: ids },
      deletedAt: null,
    };

    // AUTHOR 只能删除自己的文章
    if (user.role === "AUTHOR") {
      deleteWhereCondition.userUid = user.uid;
    }

    const result = await prisma.post.updateMany({
      where: deleteWhereCondition,
      data: {
        deletedAt: new Date(),
      },
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "DELETE",
        resourceType: "POST",
        resourceId: ids.join(","),
        vaule: {
          old: { ids },
          new: null,
        },
        description: `批量删除文章: ${ids.length} 篇`,
        metadata: {
          count: result.count,
          idsCount: ids.length,
        },
      },
    });

    return response.ok({
      data: { deleted: result.count },
    });
  } catch (error) {
    console.error("Delete posts error:", error);
    return response.serverError();
  }
}

/*
  getPostHistory - 获取文章历史版本列表
*/
export async function getPostHistory(
  params: GetPostHistory,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<PostHistoryWithStats | null>>>;
export async function getPostHistory(
  params: GetPostHistory,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<PostHistoryWithStats | null>>;
export async function getPostHistory(
  {
    access_token,
    slug,
    page = 1,
    pageSize = 25,
    sortBy = "timestamp",
    sortOrder = "desc",
  }: GetPostHistory,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostHistoryWithStats | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      slug,
      page,
      pageSize,
      sortBy,
      sortOrder,
    },
    GetPostHistorySchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 查找文章
    const post = await prisma.post.findUnique({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
        userUid: true,
      },
    });

    if (!post) {
      return response.notFound({ message: "文章不存在" });
    }

    // AUTHOR 只能查看自己的文章历史
    if (user.role === "AUTHOR" && post.userUid !== user.uid) {
      return response.forbidden({ message: "无权访问此文章的历史记录" });
    }

    // 使用 text-version 获取版本历史
    const tv = new TextVersion();
    const versionLog = tv.log(post.content);

    // 解析版本名称并关联用户信息
    const historyItems: PostHistoryItem[] = [];

    for (const versionInfo of versionLog) {
      try {
        // 使用辅助函数解析版本名称
        const { userUid, timestamp, commitMessage } = parseVersionName(
          versionInfo.version,
        );

        // 查询用户信息
        const versionUser = await prisma.user.findUnique({
          where: { uid: userUid },
          select: {
            uid: true,
            username: true,
            nickname: true,
          },
        });

        if (!versionUser) {
          throw new Error(`User not found: ${userUid}`);
        }

        historyItems.push({
          versionName: versionInfo.version,
          timestamp,
          commitMessage,
          userUid: versionUser.uid,
          username: versionUser.username,
          nickname: versionUser.nickname,
          isSnapshot: versionInfo.isSnapshot,
        });
      } catch (error) {
        console.error("Failed to parse version:", versionInfo.version, error);
        throw error;
      }
    }

    // 排序
    if (sortOrder === "desc") {
      historyItems.reverse();
    }

    // 计算统计信息（基于全部版本，而非分页后的数据）
    const stats: PostHistoryStats = {
      totalEdits: historyItems.length,
      editTimestamps: historyItems.map((item) => item.timestamp),
      editors: Array.from(
        new Map(
          historyItems.map((item) => [
            item.userUid,
            {
              userUid: item.userUid,
              username: item.username,
              nickname: item.nickname,
            },
          ]),
        ).values(),
      ),
    };

    // 分页
    const total = historyItems.length;
    const skip = (page - 1) * pageSize;
    const paginatedItems = historyItems.slice(skip, skip + pageSize);

    // 计算分页元数据
    const totalPages = Math.ceil(total / pageSize);
    const meta = {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return response.ok({
      data: {
        stats,
        versions: paginatedItems,
      },
      meta,
    });
  } catch (error) {
    console.error("Get post history error:", error);
    return response.serverError();
  }
}

/*
  getPostVersion - 获取指定版本的内容
*/
export async function getPostVersion(
  params: GetPostVersion,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<PostVersionDetail | null>>>;
export async function getPostVersion(
  params: GetPostVersion,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<PostVersionDetail | null>>;
export async function getPostVersion(
  { access_token, slug, timestamp }: GetPostVersion,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostVersionDetail | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      slug,
      timestamp,
    },
    GetPostVersionSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 查找文章
    const post = await prisma.post.findUnique({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
        userUid: true,
      },
    });

    if (!post) {
      return response.notFound({ message: "文章不存在" });
    }

    // AUTHOR 只能查看自己的文章历史
    if (user.role === "AUTHOR" && post.userUid !== user.uid) {
      return response.forbidden({ message: "无权访问此文章的历史记录" });
    }

    // 使用 text-version 获取版本历史
    const tv = new TextVersion();
    const versionLog = tv.log(post.content);

    // 如果没有提供 timestamp，获取最新版本（列表中的最后一个）
    let targetVersion: { version: string; isSnapshot: boolean } | undefined;

    if (timestamp) {
      // 查找匹配的版本
      targetVersion = findVersionByTimestamp(versionLog, timestamp);
    } else {
      // 未提供 timestamp，获取最新版本（列表中的最后一个元素）
      targetVersion = versionLog[versionLog.length - 1];
    }

    if (!targetVersion) {
      return response.notFound({
        message: timestamp ? "版本不存在" : "文章没有版本历史",
      });
    }

    // 获取该版本的内容
    const versionContent = tv.show(post.content, targetVersion.version);

    if (versionContent === null) {
      return response.notFound({ message: "无法读取版本内容" });
    }

    // 解析版本名称
    const {
      userUid,
      timestamp: versionTimestamp,
      commitMessage,
    } = parseVersionName(targetVersion.version);

    // 查询用户信息
    const versionUser = await prisma.user.findUnique({
      where: { uid: userUid },
      select: {
        uid: true,
        username: true,
        nickname: true,
      },
    });

    if (!versionUser) {
      throw new Error(`User not found: ${userUid}`);
    }

    const data: PostVersionDetail = {
      versionName: targetVersion.version,
      timestamp: versionTimestamp,
      commitMessage,
      userUid: versionUser.uid,
      username: versionUser.username,
      nickname: versionUser.nickname,
      isSnapshot: targetVersion.isSnapshot,
      content: versionContent,
    };

    return response.ok({ data });
  } catch (error) {
    console.error("Get post version error:", error);
    return response.serverError();
  }
}

/*
  resetPostToVersion - 重置文章到指定版本
*/
export async function resetPostToVersion(
  params: ResetPostToVersion,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<ResetPostToVersionResult | null>>>;
export async function resetPostToVersion(
  params: ResetPostToVersion,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<ResetPostToVersionResult | null>>;
export async function resetPostToVersion(
  { access_token, slug, timestamp }: ResetPostToVersion,
  serverConfig?: ActionConfig,
): Promise<ActionResult<ResetPostToVersionResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      slug,
      timestamp,
    },
    ResetPostToVersionSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证 - 只有管理员可以重置版本
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 查找文章
    const post = await prisma.post.findUnique({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
      },
    });

    if (!post) {
      return response.notFound({ message: "文章不存在" });
    }

    // 使用 text-version 获取版本历史
    const tv = new TextVersion();
    const versionLog = tv.log(post.content);

    // 查找匹配的版本
    const targetVersion = findVersionByTimestamp(versionLog, timestamp);

    if (!targetVersion) {
      return response.notFound({ message: "版本不存在" });
    }

    // 计算将被删除的版本数量
    const currentVersionCount = versionLog.length;
    const targetIndex = versionLog.findIndex(
      (v) => v.version === targetVersion.version,
    );
    const deletedCount = currentVersionCount - targetIndex - 1;

    // 执行 reset
    const newContent = tv.reset(post.content, targetVersion.version);

    // 更新文章内容
    await prisma.post.update({
      where: { id: post.id },
      data: { content: newContent },
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "RESET",
        resourceType: "POST_VERSION",
        resourceId: String(post.id),
        vaule: {
          old: { versionCount: currentVersionCount },
          new: { versionCount: targetIndex + 1 },
        },
        description: `重置文章版本: ${slug}`,
        metadata: {
          slug,
          targetVersion: targetVersion.version,
          deletedVersionsCount: deletedCount,
        },
      },
    });

    return response.ok({
      data: {
        slug,
        deletedVersionsCount: deletedCount,
      },
    });
  } catch (error) {
    console.error("Reset post to version error:", error);
    return response.serverError();
  }
}

/*
  squashPostToVersion - 压缩历史到指定版本
*/
export async function squashPostToVersion(
  params: SquashPostToVersion,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<SquashPostToVersionResult | null>>>;
export async function squashPostToVersion(
  params: SquashPostToVersion,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<SquashPostToVersionResult | null>>;
export async function squashPostToVersion(
  { access_token, slug, timestamp }: SquashPostToVersion,
  serverConfig?: ActionConfig,
): Promise<ActionResult<SquashPostToVersionResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      slug,
      timestamp,
    },
    SquashPostToVersionSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证 - 只有管理员可以压缩版本
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 查找文章
    const post = await prisma.post.findUnique({
      where: {
        slug,
        deletedAt: null,
      },
      select: {
        id: true,
        content: true,
      },
    });

    if (!post) {
      return response.notFound({ message: "文章不存在" });
    }

    // 使用 text-version 获取版本历史
    const tv = new TextVersion();
    const versionLog = tv.log(post.content);

    // 查找匹配的版本
    const targetVersion = findVersionByTimestamp(versionLog, timestamp);

    if (!targetVersion) {
      return response.notFound({ message: "版本不存在" });
    }

    // 计算将被压缩的版本数量
    const targetIndex = versionLog.findIndex(
      (v) => v.version === targetVersion.version,
    );
    const compressedCount = targetIndex;

    // 执行 squash
    const newContent = tv.squash(post.content, targetVersion.version);

    // 更新文章内容
    await prisma.post.update({
      where: { id: post.id },
      data: { content: newContent },
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "SQUASH",
        resourceType: "POST_VERSION",
        resourceId: String(post.id),
        vaule: {
          old: { versionCount: versionLog.length },
          new: { versionCount: versionLog.length - compressedCount },
        },
        description: `压缩文章版本: ${slug}`,
        metadata: {
          slug,
          targetVersion: targetVersion.version,
          compressedVersionsCount: compressedCount,
        },
      },
    });

    return response.ok({
      data: {
        slug,
        compressedVersionsCount: compressedCount,
      },
    });
  } catch (error) {
    console.error("Squash post to version error:", error);
    return response.serverError();
  }
}
