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
import limitControl from "@/lib/server/rate-limit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "@/lib/server/audit";
import { TextVersion } from "text-version";
import { slugify } from "@/lib/server/slugify";
import {
  getFeaturedImageUrl,
  findMediaIdByUrl,
} from "@/lib/server/media-reference";
import { MEDIA_SLOTS } from "@/types/media";
import { generateSignature } from "@/lib/server/image-crypto";

/*
  辅助函数：处理内容中的图片并提取引用关系

  功能：
  1. 检测内容中的所有存储源 URL（通过数据库匹配）
  2. 自动替换为 /p/{shortHash}{signature} 格式
  3. 提取所有图片的 Media ID（包括原有 /p/ 链接和存储源 URL）

  @param content - 文章内容
  @param prismaClient - Prisma 客户端实例
  @returns { processedContent, mediaIds } - 处理后的内容和媒体 ID 列表
*/
async function processContentImagesAndExtractReferences(
  content: string,
  prismaClient: typeof prisma,
): Promise<{ processedContent: string; mediaIds: number[] }> {
  let processedContent = content;
  const mediaIds = new Set<number>();

  // 1. 提取所有已存在的 /p/ 链接（匹配 /p/ 后跟12位字符）
  const shortLinkRegex = /\/p\/([a-zA-Z0-9_-]{12})/g;
  const shortLinkMatches = [...content.matchAll(shortLinkRegex)];

  // 2. 提取所有可能的图片 URL（http/https 开头，常见图片扩展名）
  const urlRegex =
    /https?:\/\/[^\s<>"{}|\\^`[\]]+?\.(jpg|jpeg|png|gif|webp|avif|svg|bmp|tiff|ico)/gi;
  const urlMatches = [...content.matchAll(urlRegex)];

  // 3. 批量查询数据库中的媒体
  const urlsToCheck = urlMatches.map((m) => m[0]);
  const shortHashesToCheck = shortLinkMatches.map((m) => m[1]!.substring(0, 8));

  const [mediaByUrl, mediaByShortHash] = await Promise.all([
    // 查找通过 storageUrl 匹配的媒体
    urlsToCheck.length > 0
      ? prismaClient.media.findMany({
          where: { storageUrl: { in: urlsToCheck } },
          select: { id: true, storageUrl: true, shortHash: true },
        })
      : Promise.resolve([]),
    // 查找通过 shortHash 匹配的媒体
    shortHashesToCheck.length > 0
      ? prismaClient.media.findMany({
          where: { shortHash: { in: shortHashesToCheck } },
          select: { id: true, shortHash: true },
        })
      : Promise.resolve([]),
  ]);

  // 4. 替换存储源 URL 为 /p/ 格式
  for (const media of mediaByUrl) {
    if (media.storageUrl && media.shortHash) {
      const signature = generateSignature(media.shortHash);
      const shortLink = `/p/${media.shortHash}${signature}`;
      // 全局替换所有匹配的 URL
      processedContent = processedContent.replaceAll(
        media.storageUrl,
        shortLink,
      );
      mediaIds.add(media.id);
    }
  }

  // 5. 收集所有 /p/ 格式的图片 ID
  for (const media of mediaByShortHash) {
    mediaIds.add(media.id);
  }

  return {
    processedContent,
    mediaIds: Array.from(mediaIds),
  };
}

/*
  辅助函数：根据路径查找或创建分类
  支持层级路径，如 "技术/前端/Next.js"
  返回最终分类的 ID
*/
async function findOrCreateCategoryByPath(path: string): Promise<number> {
  // 按 / 拆分路径，移除空白部分
  const parts = path
    .split("/")
    .map((p) => p.trim())
    .filter((p) => p);

  if (parts.length === 0) {
    throw new Error("Invalid category path");
  }

  let currentParentId: number | null = null;
  let currentCategoryId: number | null = null;

  // 逐层查找或创建分类
  for (const name of parts) {
    // 查找当前层级的分类
    let category: {
      id: number;
      slug: string;
      name: string;
      description: string | null;
      parentId: number | null;
      createdAt: Date;
      updatedAt: Date;
    } | null = await prisma.category.findFirst({
      where: {
        name,
        parentId: currentParentId,
      },
    });

    // 如果不存在则创建
    if (!category) {
      const slug = await slugify(name);
      category = await prisma.category.create({
        data: {
          name,
          slug,
          parentId: currentParentId,
        },
      });
    }

    // 更新父分类 ID，继续下一层
    currentCategoryId = category.id;
    currentParentId = category.id;
  }

  if (currentCategoryId === null) {
    throw new Error("Failed to create category");
  }

  return currentCategoryId;
}

/*
  辅助函数：获取或创建"未分类"分类
  返回"未分类"分类的 ID
*/
async function getOrCreateUncategorizedCategory(): Promise<number> {
  const uncategorizedName = "未分类";
  const uncategorizedSlug = "uncategorized";

  // 先查找是否已存在"未分类"分类
  let category = await prisma.category.findFirst({
    where: {
      slug: uncategorizedSlug,
      parentId: null, // 确保是根级分类
    },
  });

  // 如果不存在则创建
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: uncategorizedName,
        slug: uncategorizedSlug,
        description: "自动分配给未指定分类的文章",
        parentId: null,
      },
    });
  }

  return category.id;
}

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

  if (!(await limitControl(await headers(), "getPostsTrends"))) {
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
    id,
    authorUid,
    isPinned,
    allowComments,
    robotsIndex,
    publishedAtStart,
    publishedAtEnd,
    updatedAtStart,
    updatedAtEnd,
    createdAtStart,
    createdAtEnd,
  }: GetPostsList,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostListItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getPostsList"))) {
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
      id,
      authorUid,
      isPinned,
      allowComments,
      robotsIndex,
      publishedAtStart,
      publishedAtEnd,
      updatedAtStart,
      updatedAtEnd,
      createdAtStart,
      createdAtEnd,
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
      id?: number;
      status?: { in: ("DRAFT" | "PUBLISHED" | "ARCHIVED")[] };
      isPinned?: boolean;
      allowComments?: boolean;
      robotsIndex?: boolean;
      publishedAt?: { gte?: Date; lte?: Date };
      updatedAt?: { gte?: Date; lte?: Date };
      createdAt?: { gte?: Date; lte?: Date };
      userUid?: number; // AUTHOR 只能看到自己的文章
      OR?: Array<
        | {
            title?: { contains: string; mode: "insensitive" };
            slug?: { contains: string; mode: "insensitive" };
            excerpt?: { contains: string; mode: "insensitive" };
          }
        | { isPinned?: boolean }
        | { allowComments?: boolean }
        | { robotsIndex?: boolean }
      >;
    } = {
      deletedAt: null, // 只获取未删除的文章
    };

    // AUTHOR 只能查看自己的文章
    if (user.role === "AUTHOR") {
      where.userUid = user.uid;
    } else if (authorUid !== undefined) {
      // 非 AUTHOR 角色可以按作者 UID 筛选
      where.userUid = authorUid;
    }

    if (id !== undefined) {
      where.id = id;
    }

    if (status && status.length > 0) {
      where.status = { in: status };
    }

    // 对于布尔字段，如果数组包含两个值，表示不筛选；如果只有一个值，直接使用该值
    if (isPinned && isPinned.length === 1) {
      where.isPinned = isPinned[0];
    } else if (isPinned && isPinned.length === 2) {
      // 包含 true 和 false，不需要筛选
      // 不设置 where.isPinned
    }

    if (allowComments && allowComments.length === 1) {
      where.allowComments = allowComments[0];
    } else if (allowComments && allowComments.length === 2) {
      // 包含 true 和 false，不需要筛选
    }

    if (robotsIndex && robotsIndex.length === 1) {
      where.robotsIndex = robotsIndex[0];
    } else if (robotsIndex && robotsIndex.length === 2) {
      // 包含 true 和 false，不需要筛选
    }

    if (publishedAtStart || publishedAtEnd) {
      where.publishedAt = {};
      if (publishedAtStart) where.publishedAt.gte = new Date(publishedAtStart);
      if (publishedAtEnd) where.publishedAt.lte = new Date(publishedAtEnd);
    }

    if (updatedAtStart || updatedAtEnd) {
      where.updatedAt = {};
      if (updatedAtStart) where.updatedAt.gte = new Date(updatedAtStart);
      if (updatedAtEnd) where.updatedAt.lte = new Date(updatedAtEnd);
    }

    if (createdAtStart || createdAtEnd) {
      where.createdAt = {};
      if (createdAtStart) where.createdAt.gte = new Date(createdAtStart);
      if (createdAtEnd) where.createdAt.lte = new Date(createdAtEnd);
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
    // 按浏览量排序时先不排序,后续在应用层排序
    // 其他字段使用数据库排序
    const orderBy =
      sortBy === "viewCount"
        ? [{ id: "desc" as const }] // 临时按 ID 排序
        : [{ [sortBy]: sortOrder }];

    // 获取分页数据 - 浏览量排序时需要获取更多数据用于排序
    const fetchSize = sortBy === "viewCount" ? total : pageSize;
    const fetchSkip = sortBy === "viewCount" ? 0 : skip;

    const posts = await prisma.post.findMany({
      where,
      skip: fetchSkip,
      take: fetchSize,
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
            slug: true,
          },
        },
        viewCount: {
          select: {
            cachedCount: true,
          },
        },
        mediaRefs: {
          include: {
            media: {
              select: {
                shortHash: true,
              },
            },
          },
        },
      },
    });

    // 转换数据格式
    let data: PostListItem[] = posts.map((post) => ({
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
      featuredImage: getFeaturedImageUrl(post.mediaRefs),
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
      tags: post.tags.map((tag) => ({ name: tag.name, slug: tag.slug })),
      viewCount: post.viewCount?.cachedCount || 0,
    }));

    // 如果按浏览量排序，在应用层进行排序和分页
    if (sortBy === "viewCount") {
      // 排序：按 viewCount 排序，NULL 值视为 0
      data.sort((a, b) => {
        const diff = (b.viewCount || 0) - (a.viewCount || 0);
        if (diff !== 0) return sortOrder === "desc" ? diff : -diff;
        // viewCount 相同时按 id 排序
        return sortOrder === "desc" ? b.id - a.id : a.id - b.id;
      });

      // 应用分页
      data = data.slice(skip, skip + pageSize);
    }

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

  if (!(await limitControl(await headers(), "getPostDetail"))) {
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
        mediaRefs: {
          include: {
            media: {
              select: {
                shortHash: true,
              },
            },
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
      featuredImage: getFeaturedImageUrl(post.mediaRefs),
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

  if (!(await limitControl(await headers(), "createPost"))) {
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
    // 如果没有提供 slug，从标题自动生成
    const finalSlug = slug || (await slugify(title));

    // 检查 slug 是否已存在
    const existingPost = await prisma.post.findUnique({
      where: { slug: finalSlug },
    });

    if (existingPost) {
      return response.badRequest({ message: "该 slug 已被使用" });
    }

    // 处理内容中的图片链接：自动替换存储源 URL 为 /p/ 格式并提取引用
    const { processedContent, mediaIds } =
      await processContentImagesAndExtractReferences(content, prisma);

    // 使用 text-version 创建内容版本（使用处理后的内容）
    const tv = new TextVersion();
    const now = new Date().toISOString();
    // 如果没有提供 commitMessage，使用默认值
    const finalCommitMessage = commitMessage || "初始版本";
    const versionName = `${user.uid}:${now}:${finalCommitMessage}`;
    const versionedContent = tv.commit("", processedContent, versionName);

    // 处理发布时间：如果状态是 PUBLISHED 且没有提供 publishedAt，则使用当前时间
    let publishedAtDate: Date | null = null;
    if (status === "PUBLISHED") {
      publishedAtDate = publishedAt ? new Date(publishedAt) : new Date();
    } else if (publishedAt) {
      // 如果不是 PUBLISHED 状态但提供了 publishedAt，也保存它
      publishedAtDate = new Date(publishedAt);
    }

    // 处理分类：如果没有提供分类，自动分配到"未分类"
    let categoryConnections;
    if (categories && categories.length > 0) {
      categoryConnections = {
        connect: await Promise.all(
          categories.map(async (pathOrName) => {
            // 使用路径查找或创建分类（支持 "技术/前端/Next.js" 格式）
            const categoryId = await findOrCreateCategoryByPath(pathOrName);
            return { id: categoryId };
          }),
        ),
      };
    } else {
      // 没有分类时，自动分配到"未分类"
      const uncategorizedId = await getOrCreateUncategorizedCategory();
      categoryConnections = {
        connect: [{ id: uncategorizedId }],
      };
    }

    // 准备 mediaRefs 创建数据
    const mediaRefsData: Array<{ mediaId: number; slot: string }> = [];

    // 如果有特色图片，添加到 mediaRefs
    if (featuredImage) {
      // featuredImage 是 URL 字符串，需要查找对应的 media ID
      const mediaId = await findMediaIdByUrl(prisma, featuredImage);
      if (mediaId) {
        mediaRefsData.push({
          mediaId,
          slot: MEDIA_SLOTS.POST_FEATURED_IMAGE,
        });
      } else {
        return response.badRequest({ message: "特色图片不存在" });
      }
    }

    // 添加内容图片到 mediaRefs
    for (const mediaId of mediaIds) {
      mediaRefsData.push({
        mediaId,
        slot: MEDIA_SLOTS.POST_CONTENT_IMAGE,
      });
    }

    // 创建文章
    const post = await prisma.post.create({
      data: {
        title,
        slug: finalSlug,
        content: versionedContent,
        excerpt: excerpt || null,
        status,
        isPinned,
        allowComments,
        publishedAt: publishedAtDate,
        metaDescription: metaDescription || null,
        metaKeywords: metaKeywords || null,
        robotsIndex,
        postMode,
        userUid: user.uid,
        categories: categoryConnections,
        tags:
          tags && tags.length > 0
            ? {
                connectOrCreate: await Promise.all(
                  tags.map(async (name) => {
                    const slug = await slugify(name);
                    return {
                      where: { name },
                      create: { name, slug },
                    };
                  }),
                ),
              }
            : undefined,
        mediaRefs:
          mediaRefsData.length > 0
            ? {
                create: mediaRefsData,
              }
            : undefined,
      },
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
      },
      details: {
        action: "CREATE",
        resourceType: "POST",
        resourceId: String(post.id),
        value: {
          old: null,
          new: {
            id: post.id,
            title,
            slug: finalSlug,
            excerpt,
            featuredImage,
            status,
            isPinned,
            allowComments,
            publishedAt: publishedAtDate?.toISOString() || null,
            metaDescription,
            metaKeywords,
            robotsIndex,
            postMode,
            categories,
            tags,
            versionName,
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

  if (!(await limitControl(await headers(), "updatePost"))) {
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
        title: true,
        slug: true,
        content: true,
        excerpt: true,
        status: true,
        isPinned: true,
        allowComments: true,
        publishedAt: true,
        metaDescription: true,
        metaKeywords: true,
        robotsIndex: true,
        postMode: true,
        userUid: true, // 需要获取作者 uid 以进行权限检查
        categories: { select: { name: true } },
        tags: { select: { name: true } },
        mediaRefs: {
          include: {
            media: {
              select: {
                shortHash: true,
              },
            },
          },
        },
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
    let newVersionName: string | undefined;
    let oldVersionName: string | undefined;
    let processedContent: string | undefined;
    let contentMediaIds: number[] | undefined;

    if (content !== undefined) {
      // 先处理图片链接：自动替换存储源 URL 为 /p/ 格式并提取引用
      const result = await processContentImagesAndExtractReferences(
        content,
        prisma,
      );
      processedContent = result.processedContent;
      contentMediaIds = result.mediaIds;

      // 然后使用处理后的内容创建版本
      const tv = new TextVersion();
      const now = new Date().toISOString();
      const finalCommitMessage = commitMessage || "更新内容";
      newVersionName = `${user.uid}:${now}:${finalCommitMessage}`;
      versionedContent = tv.commit(
        existingPost.content,
        processedContent,
        newVersionName,
      );

      // 获取旧版本名称
      const versionLog = tv.log(existingPost.content);
      if (versionLog.length > 0) {
        oldVersionName = versionLog[versionLog.length - 1]?.version;
      }
    }

    // 准备 mediaRefs 更新数据
    let mediaRefsUpdateData:
      | {
          deleteMany?: { slot: string };
          create?: Array<{ mediaId: number; slot: string }>;
        }
      | undefined;

    // 检查是否需要更新 mediaRefs
    const needUpdateMediaRefs =
      featuredImage !== undefined || contentMediaIds !== undefined;

    if (needUpdateMediaRefs) {
      mediaRefsUpdateData = {};
      const mediaRefsToCreate: Array<{ mediaId: number; slot: string }> = [];

      // 处理特色图片更新
      if (featuredImage !== undefined) {
        // 先删除旧的特色图片引用
        mediaRefsUpdateData.deleteMany = {
          slot: MEDIA_SLOTS.POST_FEATURED_IMAGE,
        };

        // 如果提供了新的特色图片，添加新引用
        if (featuredImage) {
          const mediaId = await findMediaIdByUrl(prisma, featuredImage);
          if (mediaId) {
            mediaRefsToCreate.push({
              mediaId,
              slot: MEDIA_SLOTS.POST_FEATURED_IMAGE,
            });
          } else {
            return response.badRequest({ message: "特色图片不存在" });
          }
        }
      }

      // 处理内容图片更新（如果更新了内容）
      if (contentMediaIds !== undefined) {
        // 删除旧的内容图片引用
        if (!mediaRefsUpdateData.deleteMany) {
          mediaRefsUpdateData.deleteMany = {
            slot: MEDIA_SLOTS.POST_CONTENT_IMAGE,
          };
        }
        // 如果已经有 deleteMany，需要改用 deleteMany 数组
        // 但 Prisma 不支持多个 deleteMany，所以需要在事务中分别删除

        // 添加新的内容图片引用
        for (const mediaId of contentMediaIds) {
          mediaRefsToCreate.push({
            mediaId,
            slot: MEDIA_SLOTS.POST_CONTENT_IMAGE,
          });
        }
      }

      if (mediaRefsToCreate.length > 0) {
        mediaRefsUpdateData.create = mediaRefsToCreate;
      }
    }

    // 构建更新数据
    const updateData: {
      title?: string;
      slug?: string;
      content?: string;
      excerpt?: string | null;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      isPinned?: boolean;
      allowComments?: boolean;
      publishedAt?: Date | null;
      metaDescription?: string | null;
      metaKeywords?: string | null;
      robotsIndex?: boolean;
      postMode?: "MARKDOWN" | "MDX";
    } = {};

    if (title !== undefined) updateData.title = title;
    if (newSlug !== undefined) updateData.slug = newSlug;
    if (content !== undefined) updateData.content = versionedContent;
    if (excerpt !== undefined) updateData.excerpt = excerpt || null;
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

    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription || null;
    if (metaKeywords !== undefined)
      updateData.metaKeywords = metaKeywords || null;
    if (robotsIndex !== undefined) updateData.robotsIndex = robotsIndex;

    // 处理分类更新
    let categoryUpdateData:
      | {
          set: [];
          connect: Array<{ id: number }>;
        }
      | undefined;
    if (categories !== undefined) {
      if (categories.length > 0) {
        // 提供了具体的分类列表
        categoryUpdateData = {
          set: [], // 先清空所有关联
          connect: await Promise.all(
            categories.map(async (pathOrName) => {
              // 使用路径查找或创建分类（支持 "技术/前端/Next.js" 格式）
              const categoryId = await findOrCreateCategoryByPath(pathOrName);
              return { id: categoryId };
            }),
          ),
        };
      } else {
        // 明确传入了空数组，清空所有分类并分配到"未分类"
        const uncategorizedId = await getOrCreateUncategorizedCategory();
        categoryUpdateData = {
          set: [], // 先清空所有关联
          connect: [{ id: uncategorizedId }],
        };
      }
    }
    // 如果 categories === undefined，则保持原有分类不变

    // 更新文章 - 使用事务处理 mediaRefs
    const updatedPost = await prisma.$transaction(async (tx) => {
      // 1. 如果需要更新 mediaRefs，先删除相关引用
      if (needUpdateMediaRefs) {
        // 删除特色图片引用
        if (featuredImage !== undefined) {
          await tx.mediaReference.deleteMany({
            where: {
              postId: existingPost.id,
              slot: MEDIA_SLOTS.POST_FEATURED_IMAGE,
            },
          });
        }

        // 删除内容图片引用
        if (contentMediaIds !== undefined) {
          await tx.mediaReference.deleteMany({
            where: {
              postId: existingPost.id,
              slot: MEDIA_SLOTS.POST_CONTENT_IMAGE,
            },
          });
        }
      }

      // 2. 更新文章主体数据
      const updated = await tx.post.update({
        where: { id: existingPost.id },
        data: {
          ...updateData,
          // 处理分类
          ...(categoryUpdateData && { categories: categoryUpdateData }),
          // 处理标签
          ...(tags !== undefined && {
            tags: {
              set: [], // 先清空所有关联
              connectOrCreate: await Promise.all(
                tags.map(async (name) => {
                  const slug = await slugify(name);
                  return {
                    where: { name },
                    create: { name, slug },
                  };
                }),
              ),
            },
          }),
          // 处理 mediaRefs 创建
          ...(mediaRefsUpdateData?.create && {
            mediaRefs: {
              create: mediaRefsUpdateData.create,
            },
          }),
        },
      });

      return updated;
    });

    // 记录审计日志
    // 构建审计日志的 old 和 new 值，只记录被修改的字段（排除 content）
    const auditOldValue: Record<
      string,
      string | number | boolean | null | string[]
    > = {};
    const auditNewValue: Record<
      string,
      string | number | boolean | null | string[]
    > = {};

    if (title !== undefined && title !== existingPost.title) {
      auditOldValue.title = existingPost.title;
      auditNewValue.title = title;
    }
    if (newSlug !== undefined && newSlug !== existingPost.slug) {
      auditOldValue.slug = existingPost.slug;
      auditNewValue.slug = newSlug;
    }
    if (excerpt !== undefined && excerpt !== existingPost.excerpt) {
      auditOldValue.excerpt = existingPost.excerpt;
      auditNewValue.excerpt = excerpt;
    }
    if (featuredImage !== undefined) {
      const oldFeaturedImage = getFeaturedImageUrl(existingPost.mediaRefs);
      if (featuredImage !== oldFeaturedImage) {
        auditOldValue.featuredImage = oldFeaturedImage;
        auditNewValue.featuredImage = featuredImage;
      }
    }
    if (status !== undefined && status !== existingPost.status) {
      auditOldValue.status = existingPost.status;
      auditNewValue.status = status;
    }
    if (isPinned !== undefined && isPinned !== existingPost.isPinned) {
      auditOldValue.isPinned = existingPost.isPinned;
      auditNewValue.isPinned = isPinned;
    }
    if (
      allowComments !== undefined &&
      allowComments !== existingPost.allowComments
    ) {
      auditOldValue.allowComments = existingPost.allowComments;
      auditNewValue.allowComments = allowComments;
    }
    if (updateData.publishedAt !== undefined) {
      const oldPublishedAt = existingPost.publishedAt?.toISOString() || null;
      const newPublishedAt =
        updateData.publishedAt instanceof Date
          ? updateData.publishedAt.toISOString()
          : null;
      if (oldPublishedAt !== newPublishedAt) {
        auditOldValue.publishedAt = oldPublishedAt;
        auditNewValue.publishedAt = newPublishedAt;
      }
    }
    if (
      metaDescription !== undefined &&
      metaDescription !== existingPost.metaDescription
    ) {
      auditOldValue.metaDescription = existingPost.metaDescription;
      auditNewValue.metaDescription = metaDescription;
    }
    if (
      metaKeywords !== undefined &&
      metaKeywords !== existingPost.metaKeywords
    ) {
      auditOldValue.metaKeywords = existingPost.metaKeywords;
      auditNewValue.metaKeywords = metaKeywords;
    }
    if (robotsIndex !== undefined && robotsIndex !== existingPost.robotsIndex) {
      auditOldValue.robotsIndex = existingPost.robotsIndex;
      auditNewValue.robotsIndex = robotsIndex;
    }
    if (postMode !== undefined && postMode !== existingPost.postMode) {
      auditOldValue.postMode = existingPost.postMode;
      auditNewValue.postMode = postMode;
    }
    if (categories !== undefined) {
      const oldCategories = existingPost.categories.map((c) => c.name);
      const categoriesChanged =
        JSON.stringify(oldCategories.sort()) !==
        JSON.stringify(categories.sort());
      if (categoriesChanged) {
        auditOldValue.categories = oldCategories;
        auditNewValue.categories = categories;
      }
    }
    if (tags !== undefined) {
      const oldTags = existingPost.tags.map((t) => t.name);
      const tagsChanged =
        JSON.stringify(oldTags.sort()) !== JSON.stringify(tags.sort());
      if (tagsChanged) {
        auditOldValue.tags = oldTags;
        auditNewValue.tags = tags;
      }
    }
    // 如果更新了内容，记录版本号
    if (content !== undefined && oldVersionName && newVersionName) {
      auditOldValue.versionName = oldVersionName;
      auditNewValue.versionName = newVersionName;
    }

    await logAuditEvent({
      user: {
        uid: String(user.uid),
      },
      details: {
        action: "UPDATE",
        resourceType: "POST",
        resourceId: String(updatedPost.id),
        value: {
          old: auditOldValue,
          new: auditNewValue,
        },
        description: `更新文章: ${updatedPost.title}`,
        metadata: {
          postId: updatedPost.id,
          slug: updatedPost.slug,
          fieldsModifiedCount: Object.keys(auditNewValue).length,
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

  if (!(await limitControl(await headers(), "updatePosts"))) {
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
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription;
    if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;
    if (robotsIndex !== undefined) updateData.robotsIndex = robotsIndex;
    if (postMode !== undefined) updateData.postMode = postMode;

    // 如果没有要更新的字段
    if (Object.keys(updateData).length === 0) {
      return response.badRequest({ message: "没有要更新的字段" });
    }

    // 查询要更新的文章的旧值（用于审计日志）
    const postsBeforeUpdate = await prisma.post.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        ...(user.role === "AUTHOR" && { userUid: user.uid }),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        isPinned: true,
        allowComments: true,
        publishedAt: true,
        metaDescription: true,
        metaKeywords: true,
        robotsIndex: true,
        postMode: true,
        mediaRefs: {
          include: {
            media: {
              select: {
                shortHash: true,
              },
            },
          },
        },
      },
    });

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
    // 构建审计日志的 old 和 new 值，只记录被修改的字段
    const auditOldValue: Record<
      string,
      string | number | boolean | null | string[]
    > = {};
    const auditNewValue: Record<
      string,
      string | number | boolean | null | string[]
    > = {};

    // 汇总所有文章的旧值（取第一个文章的值作为代表，如果值不同则显示为数组）
    if (postsBeforeUpdate.length > 0) {
      const fieldKeys = Object.keys(updateData) as Array<
        keyof typeof updateData
      >;
      const firstPost = postsBeforeUpdate[0];

      if (firstPost) {
        for (const key of fieldKeys) {
          if (key === "publishedAt") {
            // 处理 publishedAt 字段
            const oldValues = postsBeforeUpdate.map(
              (p) => p.publishedAt?.toISOString() || null,
            );
            const uniqueOldValues = [...new Set(oldValues)];
            // 如果只有一个唯一值，直接使用；否则过滤掉 null 后作为数组
            if (uniqueOldValues.length === 1) {
              auditOldValue[key] = uniqueOldValues[0] ?? null;
            } else {
              auditOldValue[key] = uniqueOldValues.filter(
                (v): v is string => v !== null,
              );
            }
            const newValue = updateData[key];
            auditNewValue[key] =
              newValue instanceof Date
                ? newValue.toISOString()
                : (newValue ?? null);
          } else if (key in firstPost) {
            // 其他字段
            const oldValues = postsBeforeUpdate.map(
              (p) => (p as Record<string, unknown>)[key],
            );
            const uniqueOldValues = [
              ...new Set(oldValues.map((v) => JSON.stringify(v))),
            ].map((v) => JSON.parse(v));
            auditOldValue[key] =
              uniqueOldValues.length === 1
                ? (uniqueOldValues[0] ?? null)
                : uniqueOldValues;
            auditNewValue[key] = updateData[key] ?? null;
          }
        }
      }
    }

    await logAuditEvent({
      user: {
        uid: String(user.uid),
      },
      details: {
        action: "UPDATE",
        resourceType: "POST",
        resourceId: ids.join(","),
        value: {
          old: auditOldValue,
          new: auditNewValue,
        },
        description: `批量更新文章: ${ids.length} 篇`,
        metadata: {
          count: result.count,
          idsCount: ids.length,
          fieldsModifiedCount: Object.keys(auditNewValue).length,
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

  if (!(await limitControl(await headers(), "deletePosts"))) {
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
    // 查询要删除的文章的基本信息（用于审计日志）
    const postsToDelete = await prisma.post.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
        ...(user.role === "AUTHOR" && { userUid: user.uid }),
      },
      select: {
        id: true,
        title: true,
        slug: true,
        userUid: true,
      },
    });

    // AUTHOR 权限：需要验证所有要删除的文章都属于该用户
    if (user.role === "AUTHOR") {
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
      },
      details: {
        action: "DELETE",
        resourceType: "POST",
        resourceId: ids.join(","),
        value: {
          old: {
            posts: postsToDelete.map((p) => ({
              id: p.id,
              title: p.title,
              slug: p.slug,
            })),
          },
          new: null,
        },
        description: `批量删除文章: ${ids.length} 篇`,
        metadata: {
          count: result.count,
          idsCount: ids.length,
          deletedPostsCount: postsToDelete.length,
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

  if (!(await limitControl(await headers(), "getPostHistory"))) {
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

  if (!(await limitControl(await headers(), "getPostVersion"))) {
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

  if (!(await limitControl(await headers(), "resetPostToVersion"))) {
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

    // 获取将被删除的版本列表
    const deletedVersions = versionLog
      .slice(targetIndex + 1)
      .map((v) => v.version);

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
      },
      details: {
        action: "RESET",
        resourceType: "POST_VERSION",
        resourceId: String(post.id),
        value: {
          old: {
            versionCount: currentVersionCount,
            latestVersion: versionLog[versionLog.length - 1]?.version || "",
            deletedVersionsCount: deletedVersions.length,
          },
          new: {
            versionCount: targetIndex + 1,
            latestVersion: targetVersion.version,
          },
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

  if (!(await limitControl(await headers(), "squashPostToVersion"))) {
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

    // 获取将被压缩的版本列表
    const compressedVersions = versionLog
      .slice(0, targetIndex)
      .map((v) => v.version);

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
      },
      details: {
        action: "SQUASH",
        resourceType: "POST_VERSION",
        resourceId: String(post.id),
        value: {
          old: {
            versionCount: versionLog.length,
            oldestVersion: versionLog[0]?.version || "",
            compressedVersionsCount: compressedVersions.length,
          },
          new: {
            versionCount: versionLog.length - compressedCount,
            oldestVersion: targetVersion.version,
          },
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
