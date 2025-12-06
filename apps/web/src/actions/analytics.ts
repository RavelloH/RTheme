"use server";

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { UAParser } from "ua-parser-js";
import prisma from "@/lib/server/prisma";
import redis from "@/lib/server/redis";
import { getClientIP, getClientUserAgent } from "@/lib/server/getClientInfo";
import { resolveIpLocation } from "@/lib/server/ip-utils";
import limitControl from "@/lib/server/rateLimit";
import { validateData } from "@/lib/server/validator";
import ResponseBuilder from "@/lib/server/response";
import type {
  TrackPageView,
  TrackPageViewResponse,
  ApiResponse,
  ApiResponseData,
  GetAnalyticsStats,
  GetAnalyticsStatsResponse,
  AnalyticsStatsData,
  StatItem,
  DailyTrend,
  DailyPathTrend,
  PathStat,
  GetPageViews,
  GetPageViewsResponse,
  PageViewItem,
  GetRealTimeStats,
  GetRealTimeStatsResponse,
  RealTimeStatsData,
  RealTimeDataPoint,
} from "@repo/shared-types";
import {
  TrackPageViewSchema,
  GetAnalyticsStatsSchema,
  GetPageViewsSchema,
  GetRealTimeStatsSchema,
} from "@repo/shared-types";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

const REDIS_QUEUE_KEY = "np:analytics:event";
const BATCH_SIZE = 50;
const MAX_RETRIES = 2;

/**
 * 处理和规范化 referer
 * @param referer 原始 referer URL
 * @returns 规范化的 referer（外部域名）或 null（内部来源）
 */
async function normalizeReferer(
  referer: string | null | undefined,
): Promise<string | null> {
  if (!referer || !referer.trim()) {
    return null;
  }

  try {
    const refererUrl = new URL(referer);
    const refererHost = refererUrl.hostname;

    // 过滤本地地址
    if (
      refererHost === "localhost" ||
      refererHost === "127.0.0.1" ||
      refererHost.startsWith("192.168.") ||
      refererHost.startsWith("10.") ||
      refererHost.endsWith(".local")
    ) {
      return null;
    }

    // 获取当前站点的域名（从 headers 中获取）
    const headersList = await headers();
    const host = headersList.get("host");

    if (host) {
      const currentHost = host.split(":")[0]; // 移除端口号

      // 如果是同一域名，视为内部跳转，不记录
      if (refererHost === currentHost) {
        return null;
      }
    }

    // 返回协议 + 域名（不包含路径）
    return `${refererUrl.protocol}//${refererUrl.hostname}`;
  } catch {
    // 如果 URL 解析失败，返回 null
    return null;
  }
}

/**
 * Redis 操作的重试包装器
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Redis 操作失败，剩余重试次数: ${retries}`, error);
      await new Promise((resolve) => setTimeout(resolve, 100)); // 等待 100ms
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
}

/**
 * 批量写入 PageView 数据到数据库
 */
export async function flushEventsToDatabase() {
  try {
    // 从 Redis 获取前 50 条记录
    const events = await withRetry(() =>
      redis.lrange(REDIS_QUEUE_KEY, 0, BATCH_SIZE - 1),
    );

    if (events.length === 0) return;

    // 解析事件数据
    const pageViews = events
      .map((event) => {
        try {
          return JSON.parse(event);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (pageViews.length === 0) {
      // 如果解析失败，仍需删除这些记录
      await withRetry(() => redis.ltrim(REDIS_QUEUE_KEY, events.length, -1));
      return;
    }

    // 批量写入 PageView
    await prisma.pageView.createMany({
      data: pageViews,
      skipDuplicates: true,
    });

    // 更新 ViewCountCache
    const pathCounts = new Map<string, number>();
    for (const view of pageViews) {
      const count = pathCounts.get(view.path) || 0;
      pathCounts.set(view.path, count + 1);
    }

    for (const [path, count] of pathCounts.entries()) {
      // 检查是否是文章路径 /posts/[slug]
      const postMatch = path.match(/^\/posts\/([^/]+)$/);
      const postSlug = postMatch ? postMatch[1] : null;

      await prisma.viewCountCache.upsert({
        where: { path },
        create: {
          path,
          cachedCount: count,
          postSlug,
        },
        update: {
          cachedCount: { increment: count },
          ...(postSlug && { postSlug }),
        },
      });
    }

    // 执行归档操作
    await archivePageViews();

    // 删除已处理的记录
    await withRetry(() => redis.ltrim(REDIS_QUEUE_KEY, events.length, -1));

    console.log(`成功写入 ${pageViews.length} 条访问记录到数据库`);
  } catch (error) {
    console.error("批量写入数据库失败:", error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 归档历史 PageView 数据
 * 将超过 precisionDays 的数据聚合到 PageViewArchive 表，并删除原始数据
 */
async function archivePageViews() {
  try {
    // 获取配置
    const configs = await prisma.config.findMany({
      where: {
        key: {
          in: [
            "analytics.enable",
            "analytics.timezone",
            "analytics.precisionDays",
            "analytics.retentionDays",
          ],
        },
      },
    });

    const configMap = new Map(
      configs.map((c) => [c.key, (c.value as { default: unknown }).default]),
    );

    // 如果未启用分析，直接返回
    if (!configMap.get("analytics.enable")) {
      return;
    }

    const timezone = (configMap.get("analytics.timezone") as string) || "UTC";
    const precisionDays =
      (configMap.get("analytics.precisionDays") as number) || 30;
    const retentionDays =
      (configMap.get("analytics.retentionDays") as number) || 365;

    // 如果 precisionDays 为 0，不执行归档
    if (precisionDays === 0) {
      return;
    }

    // 计算归档边界日期（当前时区的今天 - precisionDays）
    const now = new Date();
    const todayInTimezone = getDateInTimezone(now, timezone);
    const archiveBoundary = new Date(todayInTimezone);
    archiveBoundary.setDate(archiveBoundary.getDate() - precisionDays);
    archiveBoundary.setHours(0, 0, 0, 0);

    // 查询需要归档的原始数据
    const pageViewsToArchive = await prisma.pageView.findMany({
      where: {
        timestamp: {
          lt: archiveBoundary,
        },
      },
    });

    if (pageViewsToArchive.length === 0) {
      // 没有需要归档的数据，但仍需检查是否有过期归档需要删除
      await cleanupExpiredArchives(retentionDays, todayInTimezone);
      return;
    }

    // 按 path 和日期分组聚合
    const archiveMap = new Map<
      string,
      {
        path: string;
        date: Date;
        totalViews: number;
        uniqueVisitors: Set<string>;
        refererStats: Map<string, number>;
        countryStats: Map<string, number>;
        regionStats: Map<string, number>;
        cityStats: Map<string, number>;
        deviceStats: Map<string, number>;
        browserStats: Map<string, number>;
        osStats: Map<string, number>;
        screenStats: Map<string, number>;
        languageStats: Map<string, number>;
        timezoneStats: Map<string, number>;
      }
    >();

    for (const view of pageViewsToArchive) {
      // 计算该记录在指定时区的日期
      const dateInTimezone = getDateInTimezone(view.timestamp, timezone);
      const dateKey = dateInTimezone.toISOString().split("T")[0];
      const key = `${view.path}:${dateKey}`;

      let stats = archiveMap.get(key);
      if (!stats) {
        stats = {
          path: view.path,
          date: dateInTimezone,
          totalViews: 0,
          uniqueVisitors: new Set(),
          refererStats: new Map(),
          countryStats: new Map(),
          regionStats: new Map(),
          cityStats: new Map(),
          deviceStats: new Map(),
          browserStats: new Map(),
          osStats: new Map(),
          screenStats: new Map(),
          languageStats: new Map(),
          timezoneStats: new Map(),
        };
        archiveMap.set(key, stats);
      }

      // 聚合统计
      stats.totalViews++;
      stats.uniqueVisitors.add(view.visitorId);

      // 聚合各维度统计
      // referer: 只记录有值的外部来源
      if (view.referer) {
        incrementMapCount(stats.refererStats, view.referer);
      }
      incrementMapCount(stats.countryStats, view.country || "unknown");
      incrementMapCount(stats.regionStats, view.region || "unknown");
      incrementMapCount(stats.cityStats, view.city || "unknown");
      incrementMapCount(stats.deviceStats, view.deviceType || "unknown");
      incrementMapCount(stats.browserStats, view.browser || "unknown");
      incrementMapCount(stats.osStats, view.os || "unknown");
      incrementMapCount(stats.screenStats, view.screenSize || "unknown");
      incrementMapCount(stats.languageStats, view.language || "unknown");
      incrementMapCount(stats.timezoneStats, view.timezone || "unknown");
    }

    // 批量插入或更新归档数据
    for (const stats of archiveMap.values()) {
      await prisma.pageViewArchive.upsert({
        where: {
          path_date: {
            path: stats.path,
            date: stats.date,
          },
        },
        create: {
          path: stats.path,
          date: stats.date,
          totalViews: stats.totalViews,
          uniqueVisitors: stats.uniqueVisitors.size,
          refererStats: Object.fromEntries(stats.refererStats),
          countryStats: Object.fromEntries(stats.countryStats),
          regionStats: Object.fromEntries(stats.regionStats),
          cityStats: Object.fromEntries(stats.cityStats),
          deviceStats: Object.fromEntries(stats.deviceStats),
          browserStats: Object.fromEntries(stats.browserStats),
          osStats: Object.fromEntries(stats.osStats),
          screenStats: Object.fromEntries(stats.screenStats),
          languageStats: Object.fromEntries(stats.languageStats),
          timezoneStats: Object.fromEntries(stats.timezoneStats),
        },
        update: {
          totalViews: stats.totalViews,
          uniqueVisitors: stats.uniqueVisitors.size,
          refererStats: Object.fromEntries(stats.refererStats),
          countryStats: Object.fromEntries(stats.countryStats),
          regionStats: Object.fromEntries(stats.regionStats),
          cityStats: Object.fromEntries(stats.cityStats),
          deviceStats: Object.fromEntries(stats.deviceStats),
          browserStats: Object.fromEntries(stats.browserStats),
          osStats: Object.fromEntries(stats.osStats),
          screenStats: Object.fromEntries(stats.screenStats),
          languageStats: Object.fromEntries(stats.languageStats),
          timezoneStats: Object.fromEntries(stats.timezoneStats),
        },
      });
    }

    // 删除已归档的 PageView 记录
    const deleteResult = await prisma.pageView.deleteMany({
      where: {
        timestamp: {
          lt: archiveBoundary,
        },
      },
    });

    console.log(
      `成功归档 ${archiveMap.size} 组数据，删除 ${deleteResult.count} 条原始记录`,
    );

    // 删除超过保留期限的归档数据
    await cleanupExpiredArchives(retentionDays, todayInTimezone);
  } catch (error) {
    console.error("归档数据失败:", error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 删除超过保留期限的归档数据
 */
async function cleanupExpiredArchives(retentionDays: number, today: Date) {
  if (retentionDays === 0) {
    return; // retentionDays = 0 表示永久保留
  }

  const retentionBoundary = new Date(today);
  retentionBoundary.setDate(retentionBoundary.getDate() - retentionDays);

  const deleteArchiveResult = await prisma.pageViewArchive.deleteMany({
    where: {
      date: {
        lt: retentionBoundary,
      },
    },
  });

  if (deleteArchiveResult.count > 0) {
    console.log(`删除 ${deleteArchiveResult.count} 条过期归档数据`);
  }
}

/**
 * Map 计数增加辅助函数
 */
function incrementMapCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

/**
 * 获取指定时区的当前日期（零点）
 */
function getDateInTimezone(date: Date, timezone: string): Date {
  try {
    // 使用 Intl.DateTimeFormat 获取时区的日期部分
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;

    // 创建该时区的零点时间（UTC）
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  } catch (error) {
    console.error(`无效的时区: ${timezone}，使用 UTC 作为降级`, error);
    const utcDate = new Date(date);
    utcDate.setUTCHours(0, 0, 0, 0);
    return utcDate;
  }
}

/**
 * 追踪页面浏览
 */
export async function trackPageView(
  params: TrackPageView,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<TrackPageViewResponse>>;
export async function trackPageView(
  params: TrackPageView,
  serverConfig?: ActionConfig,
): Promise<TrackPageViewResponse>;
export async function trackPageView(
  params: TrackPageView,
  serverConfig?: ActionConfig,
): Promise<ActionResult<null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  // 限流控制
  if (!(await limitControl(await headers(), "trackPageView"))) {
    return response.tooManyRequests();
  }

  // 参数验证
  const validationError = validateData(params, TrackPageViewSchema);
  if (validationError) return response.badRequest(validationError);

  try {
    const { path, referer, visitorId, screenSize, language, timezone } = params;

    // 获取服务端信息
    const ipAddress = await getClientIP();
    const userAgent = await getClientUserAgent();

    // 解析地理位置
    const location = resolveIpLocation(ipAddress);

    // 解析 User-Agent
    const parser = new UAParser(userAgent);
    const uaResult = parser.getResult();

    const browser = uaResult.browser.name || null;
    const browserVersion = uaResult.browser.version || null;
    const os = uaResult.os.name || null;
    const osVersion = uaResult.os.version || null;

    // 判断设备类型
    let deviceType: string | null = null;
    if (uaResult.device.type) {
      deviceType = uaResult.device.type; // mobile, tablet 等
    } else if (uaResult.device.model || uaResult.device.vendor) {
      deviceType = "mobile";
    } else {
      deviceType = "desktop";
    }

    // 规范化 referer（过滤内部来源和本地地址）
    const normalizedReferer = await normalizeReferer(referer);

    // 构建 PageView 数据
    const pageViewData = {
      path,
      ipAddress,
      userAgent: userAgent !== "unknown" ? userAgent : null,
      referer: normalizedReferer,
      country: location?.country || null,
      region: location?.region || null,
      city: location?.city || null,
      browser,
      browserVersion,
      os,
      osVersion,
      deviceType,
      screenSize: screenSize || null,
      language: language || null,
      timezone: timezone || null,
      visitorId,
    };

    // 写入 Redis 队列
    await withRetry(() =>
      redis.rpush(REDIS_QUEUE_KEY, JSON.stringify(pageViewData)),
    );

    // 检查队列长度，是否需要批量写入数据库
    const queueLength = await withRetry(() => redis.llen(REDIS_QUEUE_KEY));

    if (queueLength >= BATCH_SIZE) {
      // 异步执行批量写入，不阻塞响应
      flushEventsToDatabase().catch((error) => {
        console.error("后台批量写入失败:", error);
      });
    }

    return response.ok({ message: "追踪成功" });
  } catch (error) {
    console.error("追踪页面浏览失败:", error);
    // 静默失败，不影响用户体验
    return response.ok({ message: "追踪成功" });
  }
}

/**
 * 聚合统计项辅助函数
 */
function aggregateStats(
  records: Array<Record<string, unknown>>,
  field: string,
): StatItem[] {
  const countMap = new Map<string, number>();

  for (const record of records) {
    let value = (record[field] as string | null) || "未知";

    // 特殊处理 referer 字段：跳过空值和"未知"
    if (field === "referer" && (!record[field] || value === "未知")) {
      continue;
    }

    // 对 referer 字段进行域名提取（处理历史数据中可能包含路径的情况）
    if (field === "referer" && value !== "未知") {
      try {
        const url = new URL(value);
        value = `${url.protocol}//${url.hostname}`;
      } catch {
        // 如果解析失败，保持原值
      }
    }

    countMap.set(value, (countMap.get(value) || 0) + 1);
  }

  const total = records.length;
  const items: StatItem[] = Array.from(countMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return items;
}

/**
 * 合并归档数据的统计项
 */
function mergeArchivedStats(
  currentStats: StatItem[],
  archivedJsonStats: Record<string, number>,
): StatItem[] {
  const mergedMap = new Map<string, number>();

  // 添加当前统计
  for (const item of currentStats) {
    mergedMap.set(item.name, item.count);
  }

  // 合并归档统计
  for (const [name, count] of Object.entries(archivedJsonStats)) {
    mergedMap.set(name, (mergedMap.get(name) || 0) + count);
  }

  // 重新计算百分比
  const total = Array.from(mergedMap.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const items: StatItem[] = Array.from(mergedMap.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return items;
}

/**
 * 获取访问统计数据
 */
export async function getAnalyticsStats(
  params: GetAnalyticsStats,
): Promise<GetAnalyticsStatsResponse> {
  const response = new ResponseBuilder("serveraction");

  // 参数验证
  const validationError = validateData(params, GetAnalyticsStatsSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as unknown as GetAnalyticsStatsResponse;

  try {
    // 先同步 Redis 数据到数据库
    await flushEventsToDatabase();

    const {
      days,
      hours,
      startDate: customStartDate,
      endDate: customEndDate,
    } = params;

    let startDate: Date;
    let endDate: Date;
    let calculatedDays: number;
    let isHourlyMode = false; // 是否为小时模式

    // 计算时间范围（使用 UTC）
    const now = new Date();

    if (hours !== undefined) {
      // 使用小时模式（精确的小时范围）
      isHourlyMode = true;
      endDate = new Date(now.getTime());
      startDate = new Date(now.getTime() - hours * 60 * 60 * 1000);

      // 计算涵盖的天数（用于图表显示）
      calculatedDays = hours; // 在小时模式下，用小时数代替天数
    } else if (customStartDate && customEndDate) {
      // 使用自定义日期范围
      const [startYear, startMonth, startDay] = customStartDate
        .split("-")
        .map(Number);
      const [endYear, endMonth, endDay] = customEndDate.split("-").map(Number);

      startDate = new Date(
        Date.UTC(startYear!, startMonth! - 1, startDay!, 0, 0, 0, 0),
      );
      endDate = new Date(
        Date.UTC(endYear!, endMonth! - 1, endDay!, 23, 59, 59, 999),
      );

      // 计算天数差异
      calculatedDays =
        Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        ) + 1;
    } else {
      // 使用天数方式
      const dayCount = days || 30;
      calculatedDays = dayCount;

      startDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() - (dayCount - 1),
          0,
          0,
          0,
          0,
        ),
      );

      endDate = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
    }

    // 归档数据使用的日期范围（需要包含结束日期的下一天）
    const archiveStartDate = new Date(startDate);
    const archiveEndDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    archiveEndDate.setUTCHours(0, 0, 0, 0);

    // 获取配置中的 precisionDays（用于了解归档策略，但现在我们总是查询两个表）
    const precisionConfig = await prisma.config.findUnique({
      where: { key: "analytics.precisionDays" },
    });
    const _precisionDays = precisionConfig
      ? ((precisionConfig.value as { default: number }).default as number)
      : 30;

    // 1. 查询 PageView 数据（精确数据）
    // 注意：PageView 只包含未归档的数据，通常是最近 precisionDays 天的数据
    const pageViews = await prisma.pageView.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        path: true,
        timestamp: true,
        visitorId: true,
        referer: true,
        country: true,
        region: true,
        city: true,
        deviceType: true,
        browser: true,
        os: true,
        screenSize: true,
        language: true,
        timezone: true,
      },
    });

    // 2. 如果需要，查询归档数据
    let archivedData: Array<{
      path: string;
      date: Date;
      totalViews: number;
      uniqueVisitors: number;
      refererStats: Record<string, number> | null;
      countryStats: Record<string, number> | null;
      regionStats: Record<string, number> | null;
      cityStats: Record<string, number> | null;
      deviceStats: Record<string, number> | null;
      browserStats: Record<string, number> | null;
      osStats: Record<string, number> | null;
      screenStats: Record<string, number> | null;
      languageStats: Record<string, number> | null;
      timezoneStats: Record<string, number> | null;
    }> = [];

    // 2. 查询归档数据（总是查询，因为即使在 precisionDays 内也可能有归档数据）
    const rawArchived = await prisma.pageViewArchive.findMany({
      where: {
        date: {
          gte: archiveStartDate,
          lt: archiveEndDate, // 使用 lt 而不是 lte
        },
      },
      select: {
        path: true,
        date: true,
        totalViews: true,
        uniqueVisitors: true,
        refererStats: true,
        countryStats: true,
        regionStats: true,
        cityStats: true,
        deviceStats: true,
        browserStats: true,
        osStats: true,
        screenStats: true,
        languageStats: true,
        timezoneStats: true,
      },
    });
    archivedData = rawArchived.map((item) => ({
      ...item,
      refererStats: item.refererStats as Record<string, number> | null,
      countryStats: item.countryStats as Record<string, number> | null,
      regionStats: item.regionStats as Record<string, number> | null,
      cityStats: item.cityStats as Record<string, number> | null,
      deviceStats: item.deviceStats as Record<string, number> | null,
      browserStats: item.browserStats as Record<string, number> | null,
      osStats: item.osStats as Record<string, number> | null,
      screenStats: item.screenStats as Record<string, number> | null,
      languageStats: item.languageStats as Record<string, number> | null,
      timezoneStats: item.timezoneStats as Record<string, number> | null,
    }));

    // 3. 计算概览数据
    const totalViewsFromPageView = pageViews.length;
    const totalViewsFromArchive = archivedData.reduce(
      (sum, item) => sum + item.totalViews,
      0,
    );
    const totalViews = totalViewsFromPageView + totalViewsFromArchive;

    const uniqueVisitorsFromPageView = new Set(
      pageViews.map((v) => v.visitorId),
    ).size;
    const uniqueVisitorsFromArchive = archivedData.reduce(
      (sum, item) => sum + item.uniqueVisitors,
      0,
    );
    const uniqueVisitors =
      uniqueVisitorsFromPageView + uniqueVisitorsFromArchive;

    // 今日访问（只统计 PageView，使用 UTC）
    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const todayEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    const todayViews = pageViews.filter(
      (v) => v.timestamp >= todayStart && v.timestamp <= todayEnd,
    ).length;

    const averageViews =
      calculatedDays > 0 ? Math.round(totalViews / calculatedDays) : 0;

    // 计算会话相关指标（基于 PageView 数据）
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟会话超时

    // 按访客ID分组并排序
    const visitorSessions = new Map<
      string,
      Array<{ path: string; timestamp: Date }>
    >();
    for (const view of pageViews) {
      if (!visitorSessions.has(view.visitorId)) {
        visitorSessions.set(view.visitorId, []);
      }
      visitorSessions.get(view.visitorId)!.push({
        path: view.path,
        timestamp: view.timestamp,
      });
    }

    let totalSessions = 0;
    let bounces = 0; // 单页会话数
    let totalDuration = 0; // 总停留时长（毫秒）
    let sessionsWithDuration = 0;

    // 分析每个访客的会话
    for (const views of visitorSessions.values()) {
      if (views.length === 0) continue;

      // 按时间排序
      views.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      let _sessionStart = 0;
      let sessionPageCount = 0;
      let sessionStartTime = views[0]!.timestamp.getTime();

      for (let i = 0; i < views.length; i++) {
        const currentView = views[i]!;
        const currentTime = currentView.timestamp.getTime();

        if (
          i === 0 ||
          currentTime - views[i - 1]!.timestamp.getTime() > SESSION_TIMEOUT
        ) {
          // 新会话开始
          if (i > 0) {
            // 保存上一个会话的统计
            totalSessions++;
            if (sessionPageCount === 1) {
              bounces++;
            }
            if (sessionPageCount > 1) {
              // 计算会话停留时长（从第一个页面到最后一个页面的时间）
              const duration =
                views[i - 1]!.timestamp.getTime() - sessionStartTime;
              totalDuration += duration;
              sessionsWithDuration++;
            }
          }
          _sessionStart = i;
          sessionPageCount = 1;
          sessionStartTime = currentTime;
        } else {
          sessionPageCount++;
        }
      }

      // 保存最后一个会话
      totalSessions++;
      if (sessionPageCount === 1) {
        bounces++;
      }
      if (sessionPageCount > 1) {
        const duration =
          views[views.length - 1]!.timestamp.getTime() - sessionStartTime;
        totalDuration += duration;
        sessionsWithDuration++;
      }
    }

    const bounceRate = totalSessions > 0 ? (bounces / totalSessions) * 100 : 0;
    const averageDuration =
      sessionsWithDuration > 0
        ? Math.round(totalDuration / sessionsWithDuration / 1000)
        : 0; // 转换为秒
    const pageViewsPerSession =
      totalSessions > 0 ? totalViews / totalSessions : 0;

    // 4. 计算每日趋势
    const dailyTrendMap = new Map<
      string,
      { views: number; visitors: Set<string> }
    >();

    if (isHourlyMode) {
      // 小时模式：按小时初始化
      const totalHours = calculatedDays; // 在小时模式下，calculatedDays 实际存储的是小时数
      for (let i = 0; i < totalHours; i++) {
        const hourDate = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const hourKey = hourDate.toISOString().substring(0, 13) + ":00:00.000Z"; // YYYY-MM-DDTHH:00:00.000Z 格式
        dailyTrendMap.set(hourKey, { views: 0, visitors: new Set() });
      }
    } else {
      // 天模式：按天初始化
      for (let i = 0; i < calculatedDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split("T")[0]!;
        dailyTrendMap.set(dateKey, { views: 0, visitors: new Set() });
      }
    }

    // 聚合 PageView 数据
    for (const view of pageViews) {
      let timeKey: string;
      if (isHourlyMode) {
        // 小时精度：取到小时级别
        timeKey = view.timestamp.toISOString().substring(0, 13) + ":00:00.000Z";
      } else {
        // 天精度
        timeKey = view.timestamp.toISOString().split("T")[0]!;
      }
      const trend = dailyTrendMap.get(timeKey);
      if (trend) {
        trend.views++;
        trend.visitors.add(view.visitorId);
      }
    }

    // 聚合归档数据（仅在天模式下使用）
    if (!isHourlyMode) {
      for (const archive of archivedData) {
        const dateKey = archive.date.toISOString().split("T")[0]!;
        const trend = dailyTrendMap.get(dateKey);
        if (trend) {
          trend.views += archive.totalViews;
          // 注意: 归档数据的 uniqueVisitors 是聚合后的，无法精确累加
          // 这里简化处理，直接加上归档的独立访客数
        }
      }
    }

    const dailyTrend: DailyTrend[] = Array.from(dailyTrendMap.entries())
      .map(([date, data]) => ({
        date,
        views: data.views,
        uniqueVisitors: data.visitors.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. 计算热门路径
    const pathCountMap = new Map<string, number>();
    for (const view of pageViews) {
      pathCountMap.set(view.path, (pathCountMap.get(view.path) || 0) + 1);
    }
    for (const archive of archivedData) {
      pathCountMap.set(
        archive.path,
        (pathCountMap.get(archive.path) || 0) + archive.totalViews,
      );
    }

    const totalPathViews = Array.from(pathCountMap.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    const topPaths: PathStat[] = Array.from(pathCountMap.entries())
      .map(([path, count]) => ({
        path,
        count,
        percentage: totalPathViews > 0 ? (count / totalPathViews) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 5.5. 计算每日路径趋势（用于堆叠柱状图）
    const dailyPathTrendMap = new Map<string, Record<string, number>>();

    // 获取 Top 10 路径用于显示
    const top10PathsSet = new Set(topPaths.slice(0, 10).map((p) => p.path));

    // 初始化所有时间点
    if (isHourlyMode) {
      // 小时模式：按小时初始化
      for (let i = 0; i < calculatedDays; i++) {
        const hourDate = new Date(startDate.getTime() + i * 60 * 60 * 1000);
        const hourKey = hourDate.toISOString().substring(0, 13) + ":00:00.000Z"; // YYYY-MM-DDTHH:00:00.000Z 格式
        dailyPathTrendMap.set(hourKey, {});
      }
    } else {
      // 天模式：按天初始化
      for (let i = 0; i < calculatedDays; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split("T")[0]!;
        dailyPathTrendMap.set(dateKey, {});
      }
    }

    // 聚合 PageView 数据
    for (const view of pageViews) {
      if (top10PathsSet.has(view.path)) {
        const timeKey = isHourlyMode
          ? view.timestamp.toISOString().substring(0, 13) + ":00:00.000Z"
          : view.timestamp.toISOString().split("T")[0]!;
        const pathViews = dailyPathTrendMap.get(timeKey);
        if (pathViews) {
          pathViews[view.path] = (pathViews[view.path] || 0) + 1;
        }
      }
    }

    // 聚合归档数据（注意：归档数据只有总数，无法按路径分解）
    // 这里简化处理，归档数据不计入路径趋势图

    const dailyPathTrend: DailyPathTrend[] = Array.from(
      dailyPathTrendMap.entries(),
    )
      .map(([date, pathViews]) => ({
        date,
        pathViews,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 6. 聚合多维度统计
    // 从 PageView 聚合
    let countries = aggregateStats(pageViews, "country");
    let regions = aggregateStats(pageViews, "region");
    let cities = aggregateStats(pageViews, "city");
    let devices = aggregateStats(pageViews, "deviceType");
    let browsers = aggregateStats(pageViews, "browser");
    let os = aggregateStats(pageViews, "os");
    let referers = aggregateStats(pageViews, "referer");
    let screenSizes = aggregateStats(pageViews, "screenSize");
    let languages = aggregateStats(pageViews, "language");
    let timezones = aggregateStats(pageViews, "timezone");

    // 合并归档数据
    if (archivedData.length > 0) {
      const mergedCountryStats: Record<string, number> = {};
      const mergedRegionStats: Record<string, number> = {};
      const mergedCityStats: Record<string, number> = {};
      const mergedDeviceStats: Record<string, number> = {};
      const mergedBrowserStats: Record<string, number> = {};
      const mergedOsStats: Record<string, number> = {};
      const mergedRefererStats: Record<string, number> = {};
      const mergedScreenStats: Record<string, number> = {};
      const mergedLanguageStats: Record<string, number> = {};
      const mergedTimezoneStats: Record<string, number> = {};

      for (const archive of archivedData) {
        if (archive.countryStats) {
          for (const [key, value] of Object.entries(archive.countryStats)) {
            mergedCountryStats[key] = (mergedCountryStats[key] || 0) + value;
          }
        }
        if (archive.regionStats) {
          for (const [key, value] of Object.entries(archive.regionStats)) {
            mergedRegionStats[key] = (mergedRegionStats[key] || 0) + value;
          }
        }
        if (archive.cityStats) {
          for (const [key, value] of Object.entries(archive.cityStats)) {
            mergedCityStats[key] = (mergedCityStats[key] || 0) + value;
          }
        }
        if (archive.deviceStats) {
          for (const [key, value] of Object.entries(archive.deviceStats)) {
            mergedDeviceStats[key] = (mergedDeviceStats[key] || 0) + value;
          }
        }
        if (archive.browserStats) {
          for (const [key, value] of Object.entries(archive.browserStats)) {
            mergedBrowserStats[key] = (mergedBrowserStats[key] || 0) + value;
          }
        }
        if (archive.osStats) {
          for (const [key, value] of Object.entries(archive.osStats)) {
            mergedOsStats[key] = (mergedOsStats[key] || 0) + value;
          }
        }
        if (archive.refererStats) {
          for (const [key, value] of Object.entries(archive.refererStats)) {
            // 过滤掉空值和"未知"
            if (key && key !== "未知" && key !== "null" && key !== "direct") {
              // 对归档数据中的 referer 也进行域名提取
              let normalizedKey = key;
              try {
                const url = new URL(key);
                normalizedKey = `${url.protocol}//${url.hostname}`;
              } catch {
                // 如果解析失败，保持原值
              }
              mergedRefererStats[normalizedKey] =
                (mergedRefererStats[normalizedKey] || 0) + value;
            }
          }
        }
        if (archive.screenStats) {
          for (const [key, value] of Object.entries(archive.screenStats)) {
            mergedScreenStats[key] = (mergedScreenStats[key] || 0) + value;
          }
        }
        if (archive.languageStats) {
          for (const [key, value] of Object.entries(archive.languageStats)) {
            mergedLanguageStats[key] = (mergedLanguageStats[key] || 0) + value;
          }
        }
        if (archive.timezoneStats) {
          for (const [key, value] of Object.entries(archive.timezoneStats)) {
            mergedTimezoneStats[key] = (mergedTimezoneStats[key] || 0) + value;
          }
        }
      }

      countries = mergeArchivedStats(countries, mergedCountryStats);
      regions = mergeArchivedStats(regions, mergedRegionStats);
      cities = mergeArchivedStats(cities, mergedCityStats);
      devices = mergeArchivedStats(devices, mergedDeviceStats);
      browsers = mergeArchivedStats(browsers, mergedBrowserStats);
      os = mergeArchivedStats(os, mergedOsStats);
      referers = mergeArchivedStats(referers, mergedRefererStats);
      screenSizes = mergeArchivedStats(screenSizes, mergedScreenStats);
      languages = mergeArchivedStats(languages, mergedLanguageStats);
      timezones = mergeArchivedStats(timezones, mergedTimezoneStats);
    }

    const data: AnalyticsStatsData = {
      overview: {
        totalViews,
        uniqueVisitors,
        todayViews,
        averageViews,
        totalSessions,
        averageDuration,
        bounceRate,
        pageViewsPerSession,
      },
      dailyTrend,
      dailyPathTrend,
      topPaths,
      countries,
      regions,
      cities,
      devices,
      browsers,
      os,
      referers,
      screenSizes,
      languages,
      timezones,
    };

    return response.ok({ data }) as unknown as GetAnalyticsStatsResponse;
  } catch (error) {
    console.error("获取访问统计失败:", error);
    return response.serverError() as unknown as GetAnalyticsStatsResponse;
  }
}

/**
 * 获取页面浏览记录（分页）
 */
export async function getPageViews(
  params: GetPageViews,
  config?: ActionConfig,
): Promise<ActionResult<PageViewItem[]>> {
  const response = new ResponseBuilder(config?.environment || "serveraction");

  // 参数验证
  const validationError = validateData(params, GetPageViewsSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as unknown as GetPageViewsResponse;

  try {
    const {
      page = 1,
      pageSize = 25,
      sortBy,
      sortOrder,
      search,
      path,
      visitorId,
      country,
      region,
      city,
      deviceType,
      browser,
      os,
      timestampStart,
      timestampEnd,
    } = params;

    // 构建 where 条件
    const where: {
      path?: { contains: string };
      visitorId?: string | { contains: string };
      country?: { contains: string; mode: "insensitive" };
      region?: { contains: string; mode: "insensitive" };
      city?: { contains: string; mode: "insensitive" };
      deviceType?: { contains: string; mode: "insensitive" };
      browser?: { contains: string; mode: "insensitive" };
      os?: { contains: string; mode: "insensitive" };
      timestamp?: { gte?: Date; lte?: Date };
      OR?: Array<{
        path?: { contains: string; mode: "insensitive" };
        visitorId?: { contains: string; mode: "insensitive" };
        country?: { contains: string; mode: "insensitive" };
        city?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    // 全局搜索
    if (search && search.trim()) {
      where.OR = [
        { path: { contains: search.trim(), mode: "insensitive" } },
        { visitorId: { contains: search.trim(), mode: "insensitive" } },
        { country: { contains: search.trim(), mode: "insensitive" } },
        { city: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // 字段筛选
    if (path) {
      where.path = { contains: path };
    }
    if (visitorId) {
      where.visitorId = visitorId;
    }
    if (country) {
      where.country = { contains: country, mode: "insensitive" };
    }
    if (region) {
      where.region = { contains: region, mode: "insensitive" };
    }
    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }
    if (deviceType) {
      where.deviceType = { contains: deviceType, mode: "insensitive" };
    }
    if (browser) {
      where.browser = { contains: browser, mode: "insensitive" };
    }
    if (os) {
      where.os = { contains: os, mode: "insensitive" };
    }

    // 时间范围筛选
    if (timestampStart || timestampEnd) {
      where.timestamp = {};
      if (timestampStart) {
        where.timestamp.gte = new Date(timestampStart);
      }
      if (timestampEnd) {
        where.timestamp.lte = new Date(timestampEnd);
      }
    }

    // 构建 orderBy
    const orderBy: Record<string, "asc" | "desc"> = {};
    if (sortBy && sortOrder) {
      orderBy[sortBy] = sortOrder;
    } else {
      // 默认按时间倒序
      orderBy.timestamp = "desc";
    }

    // 查询总数
    const total = await prisma.pageView.count({ where });

    // 分页查询
    const pageViews = await prisma.pageView.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        timestamp: true,
        path: true,
        visitorId: true,
        ipAddress: true,
        referer: true,
        country: true,
        region: true,
        city: true,
        deviceType: true,
        browser: true,
        os: true,
        screenSize: true,
        language: true,
        timezone: true,
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    return response.ok({
      data: pageViews,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    }) as unknown as GetPageViewsResponse;
  } catch (error) {
    console.error("获取页面浏览记录失败:", error);
    return response.serverError() as unknown as GetPageViewsResponse;
  }
}

/**
 * 获取实时访问统计数据（最近N分钟，每分钟一个数据点）
 */
export async function getRealTimeStats(
  params: GetRealTimeStats,
): Promise<GetRealTimeStatsResponse> {
  const response = new ResponseBuilder("serveraction");

  // 参数验证
  const validationError = validateData(params, GetRealTimeStatsSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as unknown as GetRealTimeStatsResponse;

  try {
    const { minutes = 30 } = params;

    // 计算时间范围
    const now = new Date();
    const startTime = new Date(now.getTime() - minutes * 60 * 1000);

    // 查询 PageView 数据
    const pageViews = await prisma.pageView.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: now,
        },
      },
      select: {
        timestamp: true,
        visitorId: true,
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // 按分钟聚合数据
    const minuteMap = new Map<
      string,
      { views: number; visitors: Set<string> }
    >();

    // 初始化所有分钟桶
    for (let i = 0; i < minutes; i++) {
      const minuteTime = new Date(startTime.getTime() + i * 60 * 1000);
      // 格式化为 YYYY-MM-DDTHH:mm:00.000Z
      const minuteKey = new Date(
        minuteTime.getFullYear(),
        minuteTime.getMonth(),
        minuteTime.getDate(),
        minuteTime.getHours(),
        minuteTime.getMinutes(),
        0,
        0,
      ).toISOString();
      minuteMap.set(minuteKey, { views: 0, visitors: new Set() });
    }

    // 聚合数据
    let totalViews = 0;
    const allVisitors = new Set<string>();

    for (const view of pageViews) {
      // 将时间戳舍入到分钟
      const minuteTime = new Date(
        view.timestamp.getFullYear(),
        view.timestamp.getMonth(),
        view.timestamp.getDate(),
        view.timestamp.getHours(),
        view.timestamp.getMinutes(),
        0,
        0,
      );
      const minuteKey = minuteTime.toISOString();

      const bucket = minuteMap.get(minuteKey);
      if (bucket) {
        bucket.views++;
        bucket.visitors.add(view.visitorId);
        totalViews++;
        allVisitors.add(view.visitorId);
      }
    }

    // 转换为数组
    const dataPoints: RealTimeDataPoint[] = Array.from(minuteMap.entries())
      .map(([time, data]) => ({
        time,
        views: data.views,
        visitors: data.visitors.size,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));

    const data: RealTimeStatsData = {
      dataPoints,
      totalViews,
      uniqueVisitors: allVisitors.size,
    };

    return response.ok({ data }) as unknown as GetRealTimeStatsResponse;
  } catch (error) {
    console.error("获取实时访问统计失败:", error);
    return response.serverError() as unknown as GetRealTimeStatsResponse;
  }
}
