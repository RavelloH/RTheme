/**
 * 分析数据刷写与归档
 *
 * 从 Redis 队列批量写入 PageView 到数据库，并执行归档与清理。
 * 此模块为纯服务端工具函数，不作为 Server Action 暴露。
 */

import prisma from "@/lib/server/prisma";
import redis from "@/lib/server/redis";

export const REDIS_QUEUE_KEY = "np:analytics:event";
export const REDIS_VIEW_COUNT_KEY = "np:view_count:all";
export const BATCH_SIZE = 500;
const MAX_RETRIES = 2;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type FlushEventsResult = {
  success: boolean;
  flushedCount: number;
  syncedViewCountRows: number;
  archivedDateGroups: number;
  archivedRawPageViewDeleted: number;
  expiredArchiveDeleted: number;
};

export type ArchivePageViewsResult = {
  archivedDateGroups: number;
  archivedRawPageViewDeleted: number;
  expiredArchiveDeleted: number;
};

type QueuedPageView = {
  path: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string | null;
  referer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
  screenSize: string | null;
  language: string | null;
  timezone: string | null;
  visitorId: string;
  duration: number;
};

/**
 * Redis 操作的重试包装器
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Redis 操作失败，剩余重试次数: ${retries}`, error);
      await new Promise((resolve) => setTimeout(resolve, 100));
      return withRetry(operation, retries - 1);
    }
    throw error;
  }
}

/**
 * 从 Redis Hash 同步访问量到数据库
 */
async function syncViewCountsToDatabase(): Promise<number> {
  try {
    const allCounts = await withRetry(() =>
      redis.hgetall(REDIS_VIEW_COUNT_KEY),
    );

    if (!allCounts || Object.keys(allCounts).length === 0) {
      return 0;
    }

    const operations = Object.entries(allCounts).map(([path, count]) => {
      const countNum = parseInt(count, 10);
      const postMatch = path.match(/^\/posts\/([^/]+)$/);
      const postSlug = postMatch ? postMatch[1] : null;

      return prisma.viewCountCache.upsert({
        where: { path },
        create: {
          path,
          cachedCount: countNum,
          postSlug,
        },
        update: {
          cachedCount: countNum,
          ...(postSlug && { postSlug }),
        },
      });
    });

    await Promise.all(operations);

    console.log(`成功同步 ${operations.length} 条访问量到数据库`);
    return operations.length;
  } catch (error) {
    console.error("同步访问量到数据库失败:", error);
    return 0;
  }
}

/**
 * Map 计数增加辅助函数
 */
function incrementMapCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1);
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeQueuedPageView(raw: unknown): QueuedPageView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const path = record.path;
  const ipAddress = record.ipAddress;
  const visitorId = record.visitorId;
  const rawTimestamp = record.timestamp;

  if (
    typeof path !== "string" ||
    typeof ipAddress !== "string" ||
    typeof visitorId !== "string"
  ) {
    return null;
  }

  const timestamp = new Date(rawTimestamp as string | number | Date);
  if (Number.isNaN(timestamp.getTime())) {
    return null;
  }

  return {
    path,
    timestamp,
    ipAddress,
    userAgent: toNullableString(record.userAgent),
    referer: toNullableString(record.referer),
    country: toNullableString(record.country),
    region: toNullableString(record.region),
    city: toNullableString(record.city),
    browser: toNullableString(record.browser),
    browserVersion: toNullableString(record.browserVersion),
    os: toNullableString(record.os),
    osVersion: toNullableString(record.osVersion),
    deviceType: toNullableString(record.deviceType),
    screenSize: toNullableString(record.screenSize),
    language: toNullableString(record.language),
    timezone: toNullableString(record.timezone),
    visitorId,
    duration: 0,
  };
}

/**
 * 批内按访客/时间顺序计算停留时长（秒）
 * 规则：当前页时长 = 下一页时间 - 当前页时间；最后一页保持 0
 */
function applyBatchDurations(
  pageViews: QueuedPageView[],
): Map<string, QueuedPageView> {
  const visitorViewMap = new Map<string, QueuedPageView[]>();

  for (const view of pageViews) {
    const list = visitorViewMap.get(view.visitorId);
    if (list) {
      list.push(view);
    } else {
      visitorViewMap.set(view.visitorId, [view]);
    }
  }

  const firstViewByVisitor = new Map<string, QueuedPageView>();
  for (const [visitorId, views] of visitorViewMap.entries()) {
    views.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const firstView = views[0];
    if (!firstView) continue;
    firstViewByVisitor.set(visitorId, firstView);

    for (let i = 0; i < views.length - 1; i++) {
      const current = views[i]!;
      const next = views[i + 1]!;
      const diffSeconds = Math.floor(
        (next.timestamp.getTime() - current.timestamp.getTime()) / 1000,
      );
      current.duration = diffSeconds > 0 ? diffSeconds : 0;
    }
  }

  return firstViewByVisitor;
}

/**
 * 跨批次回填上一页时长：
 * 若数据库中同访客最新一条记录仍为 0，则用“本批首条时间 - 上一条时间”回填。
 */
async function backfillPreviousPageDurations(
  firstViewByVisitor: Map<string, QueuedPageView>,
): Promise<void> {
  const visitorIds = Array.from(firstViewByVisitor.keys());
  if (visitorIds.length === 0) return;

  const previousViews = await prisma.pageView.findMany({
    where: {
      visitorId: { in: visitorIds },
    },
    orderBy: [{ visitorId: "asc" }, { timestamp: "desc" }],
    distinct: ["visitorId"],
    select: {
      id: true,
      visitorId: true,
      timestamp: true,
      duration: true,
    },
  });

  const updateOps = previousViews
    .map((previous) => {
      if (previous.duration !== 0) return null;

      const firstCurrent = firstViewByVisitor.get(previous.visitorId);
      if (!firstCurrent) return null;

      const diffSeconds = Math.floor(
        (firstCurrent.timestamp.getTime() - previous.timestamp.getTime()) /
          1000,
      );
      if (diffSeconds <= 0) return null;

      return prisma.pageView.updateMany({
        where: {
          id: previous.id,
          duration: 0,
        },
        data: {
          duration: diffSeconds,
        },
      });
    })
    .filter(
      (item): item is ReturnType<typeof prisma.pageView.updateMany> =>
        item !== null,
    );

  if (updateOps.length > 0) {
    await prisma.$transaction(updateOps);
  }
}

/**
 * 规范化统计时区配置
 */
function normalizeAnalyticsTimezone(rawTimezone: unknown): string {
  const timezone =
    typeof rawTimezone === "string" && rawTimezone.trim()
      ? rawTimezone.trim()
      : "UTC";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "UTC";
  }
}

/**
 * 解析 YYYY-MM-DD 本地日期键
 */
function parseDateKey(dateKey: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number.parseInt(match[1]!, 10);
  const month = Number.parseInt(match[2]!, 10);
  const day = Number.parseInt(match[3]!, 10);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    return null;
  }

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

/**
 * 本地日期加减天数
 */
function addDaysToDateKey(dateKey: string, days: number): string {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return dateKey;

  const base = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

/**
 * 获取日期在指定时区下的本地日期键（YYYY-MM-DD）
 */
function getDateKeyInTimezone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

/**
 * 获取给定 UTC 时间在指定时区下的偏移（毫秒）
 */
function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);

  const asUtcMs = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const utcMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    0,
  );
  return asUtcMs - utcMs;
}

/**
 * 指定时区下的本地时间 -> UTC 时间
 */
function zonedDateTimeToUtc(
  input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
    millisecond: number;
  },
  timezone: string,
): Date {
  const utcGuessMs = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour,
    input.minute,
    input.second,
    input.millisecond,
  );

  let utcDate = new Date(utcGuessMs);
  const firstOffset = getTimezoneOffsetMs(utcDate, timezone);
  utcDate = new Date(utcGuessMs - firstOffset);

  const secondOffset = getTimezoneOffsetMs(utcDate, timezone);
  if (secondOffset !== firstOffset) {
    utcDate = new Date(utcGuessMs - secondOffset);
  }

  return utcDate;
}

/**
 * 指定时区下某本地日期的起始 UTC 时间
 */
function getUtcStartOfDateKey(dateKey: string, timezone: string): Date | null {
  const parsed = parseDateKey(dateKey);
  if (!parsed) return null;

  return zonedDateTimeToUtc(
    {
      ...parsed,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    timezone,
  );
}

/**
 * 将本地日期键转换为归档表中的日期（UTC 零点）
 */
function dateKeyToArchiveDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

/**
 * 删除超过保留期限的归档数据
 */
async function cleanupExpiredArchives(
  retentionDays: number,
  todayArchiveDate: Date,
): Promise<number> {
  if (retentionDays === 0) {
    return 0;
  }

  const retentionBoundary = new Date(todayArchiveDate);
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

  return deleteArchiveResult.count;
}

/**
 * 归档历史 PageView 数据
 * 将超过 precisionDays 的数据聚合到 PageViewArchive 表，并删除原始数据
 */
async function archivePageViews(): Promise<ArchivePageViewsResult> {
  const emptyResult: ArchivePageViewsResult = {
    archivedDateGroups: 0,
    archivedRawPageViewDeleted: 0,
    expiredArchiveDeleted: 0,
  };

  try {
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

    if (!configMap.get("analytics.enable")) {
      return emptyResult;
    }

    const timezone = normalizeAnalyticsTimezone(
      configMap.get("analytics.timezone"),
    );
    const precisionDays =
      (configMap.get("analytics.precisionDays") as number) || 30;
    const retentionDays =
      (configMap.get("analytics.retentionDays") as number) || 365;

    if (precisionDays === 0) {
      return emptyResult;
    }

    const now = new Date();
    const todayDayKey = getDateKeyInTimezone(now, timezone);
    const todayInArchiveDate = dateKeyToArchiveDate(todayDayKey);
    const archiveBoundaryDayKey = addDaysToDateKey(todayDayKey, -precisionDays);
    const archiveBoundary =
      getUtcStartOfDateKey(archiveBoundaryDayKey, timezone) ||
      new Date(now.getTime() - precisionDays * DAY_IN_MS);

    const pageViewsToArchive = await prisma.pageView.findMany({
      where: {
        timestamp: {
          lt: archiveBoundary,
        },
      },
    });

    if (pageViewsToArchive.length === 0) {
      const expiredArchiveDeleted = await cleanupExpiredArchives(
        retentionDays,
        todayInArchiveDate,
      );
      return {
        ...emptyResult,
        expiredArchiveDeleted,
      };
    }

    const archiveMap = new Map<
      string,
      {
        date: Date;
        totalViews: number;
        uniqueVisitors: Set<string>;
        totalSessions: number;
        bounces: number;
        totalDuration: number;
        pathStats: Map<string, { views: number; visitors: Set<string> }>;
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
        visitorSessions: Map<string, Array<{ path: string; timestamp: Date }>>;
      }
    >();

    for (const view of pageViewsToArchive) {
      const dateKey = getDateKeyInTimezone(view.timestamp, timezone);
      const dateInTimezone = dateKeyToArchiveDate(dateKey);

      let stats = archiveMap.get(dateKey);
      if (!stats) {
        stats = {
          date: dateInTimezone,
          totalViews: 0,
          uniqueVisitors: new Set(),
          totalSessions: 0,
          bounces: 0,
          totalDuration: 0,
          pathStats: new Map(),
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
          visitorSessions: new Map(),
        };
        archiveMap.set(dateKey, stats);
      }

      stats.totalViews++;
      stats.uniqueVisitors.add(view.visitorId);

      if (!stats.pathStats.has(view.path)) {
        stats.pathStats.set(view.path, { views: 0, visitors: new Set() });
      }
      const pathStat = stats.pathStats.get(view.path)!;
      pathStat.views++;
      pathStat.visitors.add(view.visitorId);

      if (!stats.visitorSessions.has(view.visitorId)) {
        stats.visitorSessions.set(view.visitorId, []);
      }
      stats.visitorSessions.get(view.visitorId)!.push({
        path: view.path,
        timestamp: view.timestamp,
      });

      incrementMapCount(stats.refererStats, view.referer || "直接访问");
      incrementMapCount(stats.countryStats, view.country || "未知");
      incrementMapCount(stats.regionStats, view.region || "未知");
      incrementMapCount(stats.cityStats, view.city || "未知");
      incrementMapCount(stats.deviceStats, view.deviceType || "未知");
      incrementMapCount(stats.browserStats, view.browser || "未知");
      incrementMapCount(stats.osStats, view.os || "未知");
      incrementMapCount(stats.screenStats, view.screenSize || "未知");
      incrementMapCount(stats.languageStats, view.language || "未知");
      incrementMapCount(stats.timezoneStats, view.timezone || "未知");
    }

    const SESSION_TIMEOUT = 30 * 60 * 1000;

    for (const stats of archiveMap.values()) {
      let totalSessions = 0;
      let bounces = 0;
      let totalDuration = 0;
      let _sessionsWithDuration = 0;

      for (const views of stats.visitorSessions.values()) {
        if (views.length === 0) continue;

        views.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        let sessionPageCount = 0;
        let sessionStartTime = views[0]!.timestamp.getTime();

        for (let i = 0; i < views.length; i++) {
          const currentView = views[i]!;
          const currentTime = currentView.timestamp.getTime();

          if (
            i === 0 ||
            currentTime - views[i - 1]!.timestamp.getTime() > SESSION_TIMEOUT
          ) {
            if (i > 0) {
              totalSessions++;
              if (sessionPageCount === 1) {
                bounces++;
              }
              if (sessionPageCount > 1) {
                const duration =
                  views[i - 1]!.timestamp.getTime() - sessionStartTime;
                totalDuration += duration;
                _sessionsWithDuration++;
              }
            }
            sessionPageCount = 1;
            sessionStartTime = currentTime;
          } else {
            sessionPageCount++;
          }
        }

        totalSessions++;
        if (sessionPageCount === 1) {
          bounces++;
        }
        if (sessionPageCount > 1) {
          const duration =
            views[views.length - 1]!.timestamp.getTime() - sessionStartTime;
          totalDuration += duration;
          _sessionsWithDuration++;
        }
      }

      const pathStatsJson: Record<string, { views: number; visitors: number }> =
        {};
      for (const [path, pathData] of stats.pathStats.entries()) {
        pathStatsJson[path] = {
          views: pathData.views,
          visitors: pathData.visitors.size,
        };
      }

      const existingArchive = await prisma.pageViewArchive.findUnique({
        where: { date: stats.date },
      });

      if (existingArchive) {
        const mergedPathStats = {
          ...((existingArchive.pathStats as Record<
            string,
            { views: number; visitors: number }
          >) || {}),
        };
        for (const [path, data] of Object.entries(pathStatsJson)) {
          if (mergedPathStats[path]) {
            mergedPathStats[path]!.views += data.views;
            mergedPathStats[path]!.visitors += data.visitors;
          } else {
            mergedPathStats[path] = data;
          }
        }

        const mergeMapStats = (
          existing: Record<string, number> | null,
          current: Map<string, number>,
        ): Record<string, number> => {
          const merged = { ...(existing || {}) };
          for (const [key, value] of current.entries()) {
            merged[key] = (merged[key] || 0) + value;
          }
          return merged;
        };

        await prisma.pageViewArchive.update({
          where: { date: stats.date },
          data: {
            totalViews: { increment: stats.totalViews },
            uniqueVisitors: { increment: stats.uniqueVisitors.size },
            totalSessions: { increment: totalSessions },
            bounces: { increment: bounces },
            totalDuration: {
              increment: Math.round(totalDuration / 1000),
            },
            pathStats: mergedPathStats,
            refererStats: mergeMapStats(
              existingArchive.refererStats as Record<string, number>,
              stats.refererStats,
            ),
            countryStats: mergeMapStats(
              existingArchive.countryStats as Record<string, number>,
              stats.countryStats,
            ),
            regionStats: mergeMapStats(
              existingArchive.regionStats as Record<string, number>,
              stats.regionStats,
            ),
            cityStats: mergeMapStats(
              existingArchive.cityStats as Record<string, number>,
              stats.cityStats,
            ),
            deviceStats: mergeMapStats(
              existingArchive.deviceStats as Record<string, number>,
              stats.deviceStats,
            ),
            browserStats: mergeMapStats(
              existingArchive.browserStats as Record<string, number>,
              stats.browserStats,
            ),
            osStats: mergeMapStats(
              existingArchive.osStats as Record<string, number>,
              stats.osStats,
            ),
            screenStats: mergeMapStats(
              existingArchive.screenStats as Record<string, number>,
              stats.screenStats,
            ),
            languageStats: mergeMapStats(
              existingArchive.languageStats as Record<string, number>,
              stats.languageStats,
            ),
            timezoneStats: mergeMapStats(
              existingArchive.timezoneStats as Record<string, number>,
              stats.timezoneStats,
            ),
          },
        });
      } else {
        await prisma.pageViewArchive.create({
          data: {
            date: stats.date,
            totalViews: stats.totalViews,
            uniqueVisitors: stats.uniqueVisitors.size,
            totalSessions,
            bounces,
            totalDuration: Math.round(totalDuration / 1000),
            pathStats: pathStatsJson,
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
    }

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

    const expiredArchiveDeleted = await cleanupExpiredArchives(
      retentionDays,
      todayInArchiveDate,
    );

    return {
      archivedDateGroups: archiveMap.size,
      archivedRawPageViewDeleted: deleteResult.count,
      expiredArchiveDeleted,
    };
  } catch (error) {
    console.error("归档数据失败:", error);
    return emptyResult;
  }
}

/**
 * 批量写入 PageView 数据到数据库
 */
export async function flushEventsToDatabase(): Promise<FlushEventsResult> {
  const emptyArchiveResult: ArchivePageViewsResult = {
    archivedDateGroups: 0,
    archivedRawPageViewDeleted: 0,
    expiredArchiveDeleted: 0,
  };

  try {
    const events = await withRetry(() =>
      redis.lrange(REDIS_QUEUE_KEY, 0, BATCH_SIZE - 1),
    );

    if (events.length === 0) {
      return {
        success: true,
        flushedCount: 0,
        syncedViewCountRows: 0,
        ...emptyArchiveResult,
      };
    }

    const pageViews = events
      .map((event) => {
        try {
          return normalizeQueuedPageView(JSON.parse(event));
        } catch {
          return null;
        }
      })
      .filter((item): item is QueuedPageView => item !== null);

    if (pageViews.length === 0) {
      await withRetry(() => redis.ltrim(REDIS_QUEUE_KEY, events.length, -1));
      return {
        success: true,
        flushedCount: 0,
        syncedViewCountRows: 0,
        ...emptyArchiveResult,
      };
    }

    const firstViewByVisitor = applyBatchDurations(pageViews);
    await backfillPreviousPageDurations(firstViewByVisitor);

    const createResult = await prisma.pageView.createMany({
      data: pageViews,
      skipDuplicates: true,
    });

    const syncedViewCountRows = await syncViewCountsToDatabase();

    const archiveResult = await archivePageViews();

    await withRetry(() => redis.ltrim(REDIS_QUEUE_KEY, events.length, -1));

    console.log(`成功写入 ${pageViews.length} 条访问记录到数据库`);
    return {
      success: true,
      flushedCount: createResult.count,
      syncedViewCountRows,
      ...archiveResult,
    };
  } catch (error) {
    console.error("批量写入数据库失败:", error);
    return {
      success: false,
      flushedCount: 0,
      syncedViewCountRows: 0,
      ...emptyArchiveResult,
    };
  }
}
