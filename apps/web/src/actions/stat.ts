"use server";
import { NextResponse } from "next/server";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import { authVerify } from "@/lib/server/auth-verify";
import {
  GetUsersStatsSuccessResponse,
  GetUsersStats,
  GetUsersStatsSchema,
  GetAuditStatsSuccessResponse,
  GetAuditStats,
  GetAuditStatsSchema,
  GetPostsStatsSuccessResponse,
  GetPostsStats,
  GetPostsStatsSchema,
  GetTagsStatsSuccessResponse,
  GetTagsStats,
  GetTagsStatsSchema,
  GetCategoriesStatsSuccessResponse,
  GetCategoriesStats,
  GetCategoriesStatsSchema,
} from "@repo/shared-types/api/stats";
import {
  GetPagesStatsSuccessResponse,
  GetPagesStats,
  GetPagesStatsSchema,
} from "@repo/shared-types/api/page";
import {
  GetStorageStatsSuccessResponse,
  GetStorageStats,
  GetStorageStatsSchema,
} from "@repo/shared-types/api/storage";
import prisma from "@/lib/server/prisma";
import { getCache, setCache, generateCacheKey } from "@/lib/server/cache";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

export async function getUsersStats(
  params: GetUsersStats,
  serverConfig: { environment: "serverless" },
): Promise<ActionResult<GetUsersStatsSuccessResponse["data"]>>;
export async function getUsersStats(
  params: GetUsersStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetUsersStatsSuccessResponse["data"]>>;
export async function getUsersStats(
  { access_token, force }: GetUsersStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetUsersStatsSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }
  const validationError = validateData(
    {
      access_token,
      force,
    },
    GetUsersStatsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "users");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetUsersStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({ data: cachedData });
      }
    }

    // 计算时间边界
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 使用一次原生 SQL 查询获取所有统计数据
    // 优化：从 7 次查询减少到 1 次查询
    const stats = await prisma.$queryRaw<
      Array<{
        role: string;
        total_count: bigint;
        active_1d: bigint;
        active_7d: bigint;
        active_30d: bigint;
        new_1d: bigint;
        new_7d: bigint;
        new_30d: bigint;
      }>
    >`
      SELECT 
        role,
        COUNT(*) as total_count,
        COUNT(CASE WHEN "lastUseAt" >= ${oneDayAgo} THEN 1 END) as active_1d,
        COUNT(CASE WHEN "lastUseAt" >= ${sevenDaysAgo} THEN 1 END) as active_7d,
        COUNT(CASE WHEN "lastUseAt" >= ${thirtyDaysAgo} THEN 1 END) as active_30d,
        COUNT(CASE WHEN "createdAt" >= ${oneDayAgo} THEN 1 END) as new_1d,
        COUNT(CASE WHEN "createdAt" >= ${sevenDaysAgo} THEN 1 END) as new_7d,
        COUNT(CASE WHEN "createdAt" >= ${thirtyDaysAgo} THEN 1 END) as new_30d
      FROM "User"
      WHERE "deletedAt" IS NULL
      GROUP BY role
    `;

    // 初始化统计数据
    const total = {
      total: 0,
      user: 0,
      admin: 0,
      editor: 0,
      author: 0,
    };

    let activeLastDay = 0;
    let activeLast7Days = 0;
    let activeLast30Days = 0;
    let newLastDay = 0;
    let newLast7Days = 0;
    let newLast30Days = 0;

    // 聚合统计结果
    stats.forEach((stat) => {
      const count = Number(stat.total_count);
      total.total += count;

      // 按角色分类
      switch (stat.role) {
        case "USER":
          total.user = count;
          break;
        case "ADMIN":
          total.admin = count;
          break;
        case "EDITOR":
          total.editor = count;
          break;
        case "AUTHOR":
          total.author = count;
          break;
      }

      // 累加活跃用户数
      activeLastDay += Number(stat.active_1d);
      activeLast7Days += Number(stat.active_7d);
      activeLast30Days += Number(stat.active_30d);

      // 累加新增用户数
      newLastDay += Number(stat.new_1d);
      newLast7Days += Number(stat.new_7d);
      newLast30Days += Number(stat.new_30d);
    });

    // 构建响应数据
    const data: GetUsersStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total,
      active: {
        lastDay: activeLastDay,
        last7Days: activeLast7Days,
        last30Days: activeLast30Days,
      },
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
    console.error("GetUsersStats error:", error);
    return response.serverError();
  }
}

export async function getAuditStats(
  params: GetAuditStats,
  serverConfig: { environment: "serverless" },
): Promise<ActionResult<GetAuditStatsSuccessResponse["data"]>>;
export async function getAuditStats(
  params: GetAuditStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetAuditStatsSuccessResponse["data"]>>;
export async function getAuditStats(
  { access_token, force }: GetAuditStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetAuditStatsSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }
  const validationError = validateData(
    {
      access_token,
      force,
    },
    GetAuditStatsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "audit");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetAuditStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({ data: cachedData });
      }
    }

    // 计算时间边界
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 使用单次查询获取所有统计数据
    const [totalLogs, activeUsers, recentLogs] = await Promise.all([
      // 总日志数
      prisma.auditLog.count(),

      // 活跃用户数（产生过日志的用户数）
      prisma.auditLog.findMany({
        select: { userUid: true },
        distinct: ["userUid"],
      }),

      // 最近的日志数量（按时间段）
      prisma.$queryRaw<
        Array<{
          last_1d: bigint;
          last_7d: bigint;
          last_30d: bigint;
        }>
      >`
        SELECT
          COUNT(CASE WHEN "timestamp" >= ${oneDayAgo} THEN 1 END) as last_1d,
          COUNT(CASE WHEN "timestamp" >= ${sevenDaysAgo} THEN 1 END) as last_7d,
          COUNT(CASE WHEN "timestamp" >= ${thirtyDaysAgo} THEN 1 END) as last_30d
        FROM "AuditLog"
      `,
    ]);

    const recentStats = recentLogs[0];

    // 构建响应数据
    const data: GetAuditStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total: {
        logs: totalLogs,
        activeUsers: activeUsers.length,
      },
      recent: {
        lastDay: Number(recentStats?.last_1d || 0),
        last7Days: Number(recentStats?.last_7d || 0),
        last30Days: Number(recentStats?.last_30d || 0),
      },
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({ data });
  } catch (error) {
    console.error("GetAuditStats error:", error);
    return response.serverError();
  }
}

export async function getPostsStats(
  params: GetPostsStats,
  serverConfig: { environment: "serverless" },
): Promise<ActionResult<GetPostsStatsSuccessResponse["data"]>>;
export async function getPostsStats(
  params: GetPostsStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetPostsStatsSuccessResponse["data"]>>;
export async function getPostsStats(
  { access_token, force }: GetPostsStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetPostsStatsSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }
  const validationError = validateData(
    {
      access_token,
      force,
    },
    GetPostsStatsSchema,
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
    const CACHE_KEY = generateCacheKey("stats", "posts");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetPostsStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({ data: cachedData });
      }
    }

    // 计算时间边界
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // 使用一次原生 SQL 查询获取所有统计数据
    const stats = await prisma.$queryRaw<
      Array<{
        status: string;
        total_count: bigint;
        new_7d: bigint;
        new_30d: bigint;
        new_1y: bigint;
      }>
    >`
      SELECT 
        status,
        COUNT(*) as total_count,
        COUNT(CASE WHEN "createdAt" >= ${sevenDaysAgo} THEN 1 END) as new_7d,
        COUNT(CASE WHEN "createdAt" >= ${thirtyDaysAgo} THEN 1 END) as new_30d,
        COUNT(CASE WHEN "createdAt" >= ${oneYearAgo} THEN 1 END) as new_1y
      FROM "Post"
      WHERE "deletedAt" IS NULL
      GROUP BY status
    `;

    // 初始化统计数据
    const total = {
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
    };

    let newLast7Days = 0;
    let newLast30Days = 0;
    let newLastYear = 0;

    // 聚合统计结果
    stats.forEach((stat) => {
      const count = Number(stat.total_count);
      total.total += count;

      // 按状态分类
      switch (stat.status) {
        case "PUBLISHED":
          total.published = count;
          break;
        case "DRAFT":
          total.draft = count;
          break;
        case "ARCHIVED":
          total.archived = count;
          break;
      }

      // 累加新增文章数
      newLast7Days += Number(stat.new_7d);
      newLast30Days += Number(stat.new_30d);
      newLastYear += Number(stat.new_1y);
    });

    // 获取最后发布的文章时间和第一篇文章时间
    const [lastPublishedPost, firstPublishedPost] = await Promise.all([
      prisma.post.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: {
          publishedAt: "desc",
        },
        select: {
          publishedAt: true,
        },
      }),
      prisma.post.findFirst({
        where: {
          status: "PUBLISHED",
          deletedAt: null,
        },
        orderBy: {
          publishedAt: "asc",
        },
        select: {
          publishedAt: true,
        },
      }),
    ]);

    // 计算平均发布间隔（天）
    let averageDaysBetweenPosts = null;
    if (
      firstPublishedPost?.publishedAt &&
      lastPublishedPost?.publishedAt &&
      total.published > 1
    ) {
      const firstDate = firstPublishedPost.publishedAt.getTime();
      const lastDate = lastPublishedPost.publishedAt.getTime();
      const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
      averageDaysBetweenPosts = daysDiff / (total.published - 1);
    }

    // 构建响应数据
    const data: GetPostsStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total,
      new: {
        last7Days: newLast7Days,
        last30Days: newLast30Days,
        lastYear: newLastYear,
      },
      lastPublished: lastPublishedPost?.publishedAt?.toISOString() || null,
      firstPublished: firstPublishedPost?.publishedAt?.toISOString() || null,
      averageDaysBetweenPosts,
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({ data });
  } catch (error) {
    console.error("GetPostsStats error:", error);
    return response.serverError();
  }
}

export async function getTagsStats(
  params: GetTagsStats,
  serverConfig: { environment: "serverless" },
): Promise<ActionResult<GetTagsStatsSuccessResponse["data"]>>;
export async function getTagsStats(
  params: GetTagsStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetTagsStatsSuccessResponse["data"]>>;
export async function getTagsStats(
  { access_token, force }: GetTagsStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetTagsStatsSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }
  const validationError = validateData(
    {
      access_token,
      force,
    },
    GetTagsStatsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "tags");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetTagsStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({ data: cachedData });
      }
    }

    // 计算时间边界
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // 使用一次原生 SQL 查询获取标签统计数据
    const [totalTags, tagsWithPosts, newTagsStats] = await Promise.all([
      // 总标签数
      prisma.tag.count(),

      // 有文章关联的标签数（只统计未删除的文章）
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT pt."B") as count
        FROM "_PostToTag" pt
        INNER JOIN "Post" p ON pt."A" = p.id
        WHERE p."deletedAt" IS NULL
      `,

      // 新增标签统计
      prisma.$queryRaw<
        Array<{
          new_7d: bigint;
          new_30d: bigint;
          new_1y: bigint;
        }>
      >`
        SELECT
          COUNT(CASE WHEN "createdAt" >= ${sevenDaysAgo} THEN 1 END) as new_7d,
          COUNT(CASE WHEN "createdAt" >= ${thirtyDaysAgo} THEN 1 END) as new_30d,
          COUNT(CASE WHEN "createdAt" >= ${oneYearAgo} THEN 1 END) as new_1y
        FROM "Tag"
      `,
    ]);

    const tagsWithPostsCount = Number(tagsWithPosts[0]?.count || 0);
    const newStats = newTagsStats[0];

    // 构建响应数据
    const data: GetTagsStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total: {
        total: totalTags,
        withPosts: tagsWithPostsCount,
        withoutPosts: totalTags - tagsWithPostsCount,
      },
      new: {
        last7Days: Number(newStats?.new_7d || 0),
        last30Days: Number(newStats?.new_30d || 0),
        lastYear: Number(newStats?.new_1y || 0),
      },
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({ data });
  } catch (error) {
    console.error("GetTagsStats error:", error);
    return response.serverError();
  }
}

export async function getCategoriesStats(
  params: GetCategoriesStats,
  serverConfig: { environment: "serverless" },
): Promise<ActionResult<GetCategoriesStatsSuccessResponse["data"]>>;
export async function getCategoriesStats(
  params: GetCategoriesStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetCategoriesStatsSuccessResponse["data"]>>;
export async function getCategoriesStats(
  { access_token, force }: GetCategoriesStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetCategoriesStatsSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );
  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }
  const validationError = validateData(
    {
      access_token,
      force,
    },
    GetCategoriesStatsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "categories");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<
        GetCategoriesStatsSuccessResponse["data"]
      >(CACHE_KEY, {
        ttl: CACHE_TTL,
      });

      if (cachedData) {
        return response.ok({ data: cachedData });
      }
    }

    // 计算时间边界
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    // 获取所有分类及其关联信息
    const [
      totalCategories,
      topLevelCategories,
      categoriesWithPosts,
      newCategoriesStats,
    ] = await Promise.all([
      // 总分类数
      prisma.category.count(),

      // 顶级分类数（无父分类）
      prisma.category.count({
        where: {
          parentId: null,
        },
      }),

      // 有文章关联的分类数
      prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT pc."B") as count
        FROM "_CategoryToPost" pc
        INNER JOIN "Post" p ON pc."A" = p.id
        WHERE p."deletedAt" IS NULL
      `,

      // 新增分类统计
      prisma.$queryRaw<
        Array<{
          new_7d: bigint;
          new_30d: bigint;
          new_1y: bigint;
        }>
      >`
        SELECT
          COUNT(CASE WHEN "createdAt" >= ${sevenDaysAgo} THEN 1 END) as new_7d,
          COUNT(CASE WHEN "createdAt" >= ${thirtyDaysAgo} THEN 1 END) as new_30d,
          COUNT(CASE WHEN "createdAt" >= ${oneYearAgo} THEN 1 END) as new_1y
        FROM "Category"
      `,
    ]);

    const categoriesWithPostsCount = Number(categoriesWithPosts[0]?.count || 0);
    const newStats = newCategoriesStats[0];

    // 获取所有分类以计算深度和热门分类
    const allCategories = await prisma.category.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        parentId: true,
        _count: {
          select: {
            posts: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
      },
    });

    // 使用 Map 缓存深度计算结果，避免重复计算
    const depthCache = new Map<number, number>();

    const calculateDepth = (
      categoryId: number,
      visited = new Set<number>(),
    ): number => {
      // 检查缓存
      if (depthCache.has(categoryId)) {
        return depthCache.get(categoryId)!;
      }

      // 防止循环引用
      if (visited.has(categoryId)) return 0;
      visited.add(categoryId);

      const category = allCategories.find((c) => c.id === categoryId);
      if (!category || category.parentId === null) {
        depthCache.set(categoryId, 0);
        return 0;
      }

      const depth = 1 + calculateDepth(category.parentId, visited);
      depthCache.set(categoryId, depth);
      return depth;
    };

    let maxDepth = 0;
    let totalDepth = 0;

    for (const category of allCategories) {
      const depth = calculateDepth(category.id);
      if (depth > maxDepth) maxDepth = depth;
      totalDepth += depth;
    }

    const avgDepth =
      allCategories.length > 0 ? totalDepth / allCategories.length : 0;

    // 构建响应数据
    const data: GetCategoriesStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total: {
        total: totalCategories,
        topLevel: topLevelCategories,
        withPosts: categoriesWithPostsCount,
        withoutPosts: totalCategories - categoriesWithPostsCount,
      },
      depth: {
        maxDepth,
        avgDepth,
      },
      new: {
        last7Days: Number(newStats?.new_7d || 0),
        last30Days: Number(newStats?.new_30d || 0),
        lastYear: Number(newStats?.new_1y || 0),
      },
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({ data });
  } catch (error) {
    console.error("GetCategoriesStats error:", error);
    return response.serverError();
  }
}

export async function getPagesStats(
  params: GetPagesStats,
  serverConfig: { environment: "serverless" },
): Promise<ActionResult<GetPagesStatsSuccessResponse["data"]>>;
export async function getPagesStats(
  params: GetPagesStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetPagesStatsSuccessResponse["data"]>>;
export async function getPagesStats(
  { access_token, force }: GetPagesStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetPagesStatsSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      force,
    },
    GetPagesStatsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 验证用户身份（仅管理员）
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized({ message: "需要管理员权限" });
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "pages");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetPagesStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({ data: cachedData });
      }
    }

    // 获取页面统计数据
    const [totalStats, statusStats, systemPageStats] = await Promise.all([
      // 总数统计
      prisma.page.count({
        where: {
          deletedAt: null,
        },
      }),
      // 状态统计
      prisma.page.groupBy({
        by: ["status"],
        where: {
          deletedAt: null,
        },
        _count: {
          status: true,
        },
      }),
      // 系统页面统计
      prisma.page.groupBy({
        by: ["isSystemPage"],
        where: {
          deletedAt: null,
        },
        _count: {
          isSystemPage: true,
        },
      }),
    ]);

    // 统计各状态数量
    const statusCounts = statusStats.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 统计系统/自定义页面数量
    const systemCounts = systemPageStats.reduce(
      (acc, item) => {
        acc[item.isSystemPage ? "system" : "custom"] = item._count.isSystemPage;
        return acc;
      },
      {} as Record<string, number>,
    );

    const now = new Date();
    const statsData = {
      updatedAt: now.toISOString(),
      cache: false, // 实时查询
      total: {
        total: totalStats,
        active: statusCounts.ACTIVE || 0,
        suspended: statusCounts.SUSPENDED || 0,
        system: systemCounts.system || 0,
        custom: systemCounts.custom || 0,
      },
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...statsData, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({
      data: statsData,
    });
  } catch (error) {
    console.error("获取页面统计失败:", error);
    return response.serverError({ message: "获取页面统计失败" });
  }
}

export async function getStorageStats(
  params: GetStorageStats,
  serverConfig: { environment: "serverless" },
): Promise<ActionResult<GetStorageStatsSuccessResponse["data"]>>;
export async function getStorageStats(
  params: GetStorageStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetStorageStatsSuccessResponse["data"]>>;
export async function getStorageStats(
  { access_token, force }: GetStorageStats,
  serverConfig?: ActionConfig,
): Promise<ActionResult<GetStorageStatsSuccessResponse["data"] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      force,
    },
    GetStorageStatsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "storage");
    const CACHE_TTL = 60 * 60; // 1小时

    // 如果不是强制刷新，尝试从缓存获取
    if (!force) {
      const cachedData = await getCache<GetStorageStatsSuccessResponse["data"]>(
        CACHE_KEY,
        {
          ttl: CACHE_TTL,
        },
      );

      if (cachedData) {
        return response.ok({ data: cachedData });
      }
    }

    const now = new Date();

    // 获取存储统计数据
    const [totalStats, typeStats, totalMediaFiles, totalMediaSize] =
      await Promise.all([
        // 总体统计
        prisma.storageProvider.findMany({
          select: {
            isActive: true,
            isDefault: true,
          },
        }),

        // 按类型统计
        prisma.storageProvider.groupBy({
          by: ["type"],
          _count: {
            id: true,
          },
          where: {
            isActive: true,
          },
        }),

        // 总媒体文件数
        prisma.media.count(),

        // 总媒体文件大小
        prisma.media.aggregate({
          _sum: {
            size: true,
          },
        }),
      ]);

    // 计算总体统计
    const total = {
      total: totalStats.length,
      active: totalStats.filter((s) => s.isActive).length,
      inactive: totalStats.filter((s) => !s.isActive).length,
      default: totalStats.filter((s) => s.isDefault).length,
    };

    // 按类型统计详细信息
    const byType = await Promise.all(
      typeStats.map(async (stat) => {
        const mediaCount = await prisma.media.count({
          where: {
            StorageProvider: {
              type: stat.type,
              isActive: true,
            },
          },
        });

        return {
          type: stat.type,
          count: stat._count.id,
          active: stat._count.id,
          mediaCount,
        };
      }),
    );

    // 计算存储信息
    const storage = {
      totalProviders: totalStats.length,
      activeProviders: total.active,
      totalMediaFiles,
      averageFileSize:
        totalMediaFiles > 0
          ? (totalMediaSize._sum.size || 0) / totalMediaFiles
          : 0,
    };

    // 构建响应数据
    const data: GetStorageStatsSuccessResponse["data"] = {
      updatedAt: now.toISOString(),
      cache: false,
      total,
      byType,
      storage,
    };

    // 保存到缓存（缓存1小时）
    const cacheData = { ...data, cache: true };
    await setCache(CACHE_KEY, cacheData, {
      ttl: CACHE_TTL,
    });

    return response.ok({ data });
  } catch (error) {
    console.error("GetStorageStats error:", error);
    return response.serverError();
  }
}
