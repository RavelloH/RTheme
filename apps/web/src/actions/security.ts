"use server";

import { headers } from "next/headers";
import {
  GetSecurityOverviewSchema,
  GetSecurityOverview,
  SecurityOverviewData,
  GetIPListSchema,
  GetIPList,
  IPInfo,
  BanIPSchema,
  BanIP,
  UnbanIPSchema,
  UnbanIP,
  ClearRateLimitSchema,
  ClearRateLimit,
  GetEndpointStatsSchema,
  GetEndpointStats,
  EndpointStat,
  GetRequestTrendsSchema,
  GetRequestTrends,
  RequestTrendItem,
} from "@repo/shared-types/api/security";
import { ApiResponse } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rate-limit";
import { validateData } from "@/lib/server/validator";
import redis, { ensureRedisConnection } from "@/lib/server/redis";
import { authVerify } from "@/lib/server/auth-verify";
import { getCache, setCache, generateCacheKey } from "@/lib/server/cache";

const RATE_LIMIT = 60; // 与 rateLimit.ts 保持一致

// IP 归属地解析相关
let ipSearcher: {
  btreeSearchSync?: (ip: string) => { region?: string };
  binarySearchSync?: (ip: string) => { region?: string };
} | null = null;

function isIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number(part);
    return Number.isInteger(num) && num >= 0 && num <= 255;
  });
}

function isPrivateIP(ip: string): boolean {
  if (ip === "::1" || ip === "::ffff:127.0.0.1") return true;
  if (ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (ip.startsWith("172.")) {
    const second = parseInt(ip.split(".")[1] ?? "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("169.254.")) return true;
  return false;
}

function getIpSearcher() {
  if (ipSearcher) return ipSearcher;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IP2Region = require("node-ip2region");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    const dbPath = path.join(
      process.cwd(),
      "node_modules/node-ip2region/data/ip2region.db",
    );
    ipSearcher = IP2Region.create(dbPath);
    return ipSearcher;
  } catch {
    return null;
  }
}

function resolveIpLocation(ip: string | null): string | null {
  if (!ip || ip === "unknown") return null;
  if (isPrivateIP(ip)) return null;
  if (!isIPv4(ip)) return null;

  try {
    const searcher = getIpSearcher();
    if (!searcher) return null;

    const regionResult =
      (searcher.btreeSearchSync?.(ip) as { region?: string } | undefined) ||
      (searcher.binarySearchSync?.(ip) as { region?: string } | undefined);

    const regionText = regionResult?.region;
    if (!regionText) return null;
    const parts = regionText.split("|");
    const locationParts = parts
      .slice(0, 4)
      .filter((part) => part && part !== "0");
    return locationParts.length ? locationParts.join(" ") : null;
  } catch {
    return null;
  }
}

/**
 * 获取安全概览数据
 */
export async function getSecurityOverview(
  params: GetSecurityOverview = {},
): Promise<ApiResponse<SecurityOverviewData | null>> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "getSecurityOverview"))) {
    return response.tooManyRequests() as ApiResponse<SecurityOverviewData | null>;
  }

  const validationError = validateData(params, GetSecurityOverviewSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as ApiResponse<SecurityOverviewData | null>;

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: params.access_token,
  });

  if (!user) {
    return response.unauthorized() as ApiResponse<SecurityOverviewData | null>;
  }

  try {
    const CACHE_KEY = generateCacheKey("stats", "security");
    const CACHE_TTL = 5 * 60; // 5分钟缓存（安全数据需要相对实时）

    // 如果不是强制刷新，尝试从缓存获取
    if (!params.force) {
      const cachedData = await getCache<SecurityOverviewData>(CACHE_KEY, {
        ttl: CACHE_TTL,
      });

      if (cachedData) {
        return response.ok({
          data: cachedData,
        }) as ApiResponse<SecurityOverviewData | null>;
      }
    }

    await ensureRedisConnection();

    const currentTime = Date.now();
    const oneMinuteAgo = currentTime - 60000;
    const currentHour = Math.floor(currentTime / 3600000);

    // 获取所有速率限制键（新的 key 格式）
    const rateLimitKeys = await redis.keys("np:rate:ip:*");

    // 获取所有封禁键（新的 key 格式）
    const banKeys = await redis.keys("np:rate:ban:*");

    // 获取全局统计计数器（永久）
    const [totalSuccessStr, totalErrorStr] = await Promise.all([
      redis.get("np:stat:success"),
      redis.get("np:stat:error"),
    ]);
    const totalSuccess = totalSuccessStr ? parseInt(totalSuccessStr, 10) : 0;
    const totalError = totalErrorStr ? parseInt(totalErrorStr, 10) : 0;
    const totalRequests = totalSuccess + totalError;

    // 获取当前小时请求数（成功 + 错误）
    const [currentHourSuccessStr, currentHourErrorStr] = await Promise.all([
      redis.get(`np:stat:hour:${currentHour}:success`),
      redis.get(`np:stat:hour:${currentHour}:error`),
    ]);
    const currentHourRequests =
      (currentHourSuccessStr ? parseInt(currentHourSuccessStr, 10) : 0) +
      (currentHourErrorStr ? parseInt(currentHourErrorStr, 10) : 0);

    // 计算活跃IP和被限流IP（基于最近1分钟的请求）
    let activeIPs = 0;
    let rateLimitedIPs = 0;

    for (const key of rateLimitKeys) {
      const count = await redis.zcount(key, oneMinuteAgo, currentTime);
      if (count > 0) {
        activeIPs++;
        if (count >= RATE_LIMIT * 0.8) {
          rateLimitedIPs++;
        }
      }
    }

    // 获取最近24小时的统计数据
    let last24hSuccess = 0;
    let last24hError = 0;
    let last24hActiveHours = 0;
    const hourlyTrends: { hour: string; count: number }[] = [];

    for (let i = 23; i >= 0; i--) {
      const targetHour = currentHour - i;
      const [successStr, errorStr] = await Promise.all([
        redis.get(`np:stat:hour:${targetHour}:success`),
        redis.get(`np:stat:hour:${targetHour}:error`),
      ]);
      const success = successStr ? parseInt(successStr, 10) : 0;
      const error = errorStr ? parseInt(errorStr, 10) : 0;

      last24hSuccess += success;
      last24hError += error;

      // 统计有数据的小时数
      if (success > 0 || error > 0) {
        last24hActiveHours++;
      }

      const hourTimestamp = targetHour * 3600000;
      const date = new Date(hourTimestamp);
      hourlyTrends.push({
        hour: `${date.getHours().toString().padStart(2, "0")}:00`,
        count: success + error,
      });
    }

    // 获取最近30天的统计数据（30*24=720小时）
    let last30dSuccess = 0;
    let last30dError = 0;
    const activeDaysSet = new Set<number>(); // 用 Set 记录有数据的天

    for (let i = 30 * 24 - 1; i >= 0; i--) {
      const targetHour = currentHour - i;
      const [successStr, errorStr] = await Promise.all([
        redis.get(`np:stat:hour:${targetHour}:success`),
        redis.get(`np:stat:hour:${targetHour}:error`),
      ]);
      const success = successStr ? parseInt(successStr, 10) : 0;
      const error = errorStr ? parseInt(errorStr, 10) : 0;

      last30dSuccess += success;
      last30dError += error;

      // 统计有数据的天数（按天去重）
      if (success > 0 || error > 0) {
        const dayIndex = Math.floor(targetHour / 24);
        activeDaysSet.add(dayIndex);
      }
    }

    const last30dActiveDays = activeDaysSet.size;

    const resultData: SecurityOverviewData = {
      activeIPs,
      bannedIPs: banKeys.length,
      currentHourRequests,
      hourlyTrends,
      rateLimitedIPs,
      totalRequests,
      totalSuccess,
      totalError,
      last24hSuccess,
      last24hError,
      last24hActiveHours,
      last30dSuccess,
      last30dError,
      last30dActiveDays,
      cache: false,
      updatedAt: new Date().toISOString(),
    };

    // 写入缓存
    await setCache(CACHE_KEY, resultData, { ttl: CACHE_TTL });

    return response.ok({
      data: resultData,
    }) as ApiResponse<SecurityOverviewData | null>;
  } catch (error) {
    console.error("获取安全概览失败:", error);
    return response.serverError({
      message: "获取安全概览失败",
    }) as ApiResponse<SecurityOverviewData | null>;
  }
}

/**
 * 获取IP列表
 */
type IPListResponse = {
  items: IPInfo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getIPList(
  params: GetIPList,
): Promise<ApiResponse<IPListResponse | null>> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "getIPList"))) {
    return response.tooManyRequests() as ApiResponse<IPListResponse | null>;
  }

  const validationError = validateData(params, GetIPListSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as ApiResponse<IPListResponse | null>;

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: params.access_token,
  });

  if (!user) {
    return response.unauthorized() as ApiResponse<IPListResponse | null>;
  }

  try {
    await ensureRedisConnection();

    const {
      page = 1,
      pageSize = 20,
      filter = "all",
      sortBy = "requestCount",
      sortOrder = "desc",
      search,
    } = params;

    const currentTime = Date.now();
    const oneMinuteAgo = currentTime - 60000;

    // 使用新的 key 格式
    const [rateLimitKeys, banKeys] = await Promise.all([
      redis.keys("np:rate:ip:*"),
      redis.keys("np:rate:ban:*"),
    ]);

    // 创建封禁IP映射
    const bannedIPMap = new Map<string, { expiry: number; reason?: string }>();
    for (const key of banKeys) {
      const ip = key.replace("np:rate:ban:", "");
      const [ttl, reason] = await Promise.all([redis.ttl(key), redis.get(key)]);
      bannedIPMap.set(ip, {
        expiry: ttl > 0 ? currentTime + ttl * 1000 : 0,
        reason: reason || undefined,
      });
    }

    // 构建IP信息列表
    const allIPs: IPInfo[] = [];

    const oneDayAgo = currentTime - 24 * 60 * 60 * 1000;

    for (const key of rateLimitKeys) {
      const ip = key.replace("np:rate:ip:", "");
      const [realtimeCount, last24hCount, lastRequestScores] =
        await Promise.all([
          redis.zcount(key, oneMinuteAgo, currentTime),
          redis.zcount(key, oneDayAgo, currentTime),
          redis.zrevrange(key, 0, 0, "WITHSCORES"),
        ]);

      const lastRequest =
        lastRequestScores.length >= 2
          ? parseInt(lastRequestScores[1] as string, 10)
          : 0;
      const banInfo = bannedIPMap.get(ip);
      const location = resolveIpLocation(ip);

      allIPs.push({
        ip,
        requestCount: realtimeCount, // 兼容旧字段
        realtimeCount,
        last24hCount,
        lastRequest,
        isBanned: !!banInfo,
        banExpiry: banInfo?.expiry,
        banReason: banInfo?.reason,
        location: location || undefined,
      });
    }

    // 添加只有封禁记录的IP
    for (const [ip, banInfo] of bannedIPMap) {
      if (!allIPs.find((item) => item.ip === ip)) {
        const location = resolveIpLocation(ip);
        allIPs.push({
          ip,
          requestCount: 0,
          realtimeCount: 0,
          last24hCount: 0,
          lastRequest: 0,
          isBanned: true,
          banExpiry: banInfo.expiry,
          banReason: banInfo.reason,
          location: location || undefined,
        });
      }
    }

    // 筛选
    let filteredIPs = allIPs;
    if (filter === "banned") {
      filteredIPs = allIPs.filter((item) => item.isBanned);
    } else if (filter === "rate-limited") {
      filteredIPs = allIPs.filter(
        (item) => item.requestCount >= RATE_LIMIT * 0.8,
      );
    } else if (filter === "active") {
      filteredIPs = allIPs.filter((item) => item.requestCount > 0);
    }

    if (search) {
      filteredIPs = filteredIPs.filter((item) => item.ip.includes(search));
    }

    // 排序
    filteredIPs.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "ip") {
        comparison = a.ip.localeCompare(b.ip);
      } else if (sortBy === "requestCount" || sortBy === "realtimeCount") {
        comparison =
          (a.realtimeCount ?? a.requestCount) -
          (b.realtimeCount ?? b.requestCount);
      } else if (sortBy === "last24hCount") {
        comparison = (a.last24hCount ?? 0) - (b.last24hCount ?? 0);
      } else if (sortBy === "lastRequest") {
        comparison = a.lastRequest - b.lastRequest;
      }
      return sortOrder === "desc" ? -comparison : comparison;
    });

    // 分页
    const total = filteredIPs.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const items = filteredIPs.slice(startIndex, startIndex + pageSize);

    return response.ok({
      data: { items, total, page, pageSize, totalPages },
    }) as ApiResponse<IPListResponse | null>;
  } catch (error) {
    console.error("获取IP列表失败:", error);
    return response.serverError({
      message: "获取IP列表失败",
    }) as ApiResponse<IPListResponse | null>;
  }
}

/**
 * 封禁IP
 */
type BanIPResponse = { ip: string; bannedUntil: number; reason?: string };

export async function banIP(
  params: BanIP,
): Promise<ApiResponse<BanIPResponse | null>> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "banIP"))) {
    return response.tooManyRequests() as ApiResponse<BanIPResponse | null>;
  }

  const validationError = validateData(params, BanIPSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as ApiResponse<BanIPResponse | null>;

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: params.access_token,
  });

  if (!user) {
    return response.unauthorized() as ApiResponse<BanIPResponse | null>;
  }

  try {
    await ensureRedisConnection();

    const { ip, duration = 3600, reason } = params;
    // 使用新的 key 格式
    const banKey = `np:rate:ban:${ip}`;
    const bannedUntil = Date.now() + duration * 1000;

    await redis.set(banKey, reason || "管理员手动封禁", "EX", duration);

    return response.ok({
      data: { ip, bannedUntil, reason },
    }) as ApiResponse<BanIPResponse | null>;
  } catch (error) {
    console.error("封禁IP失败:", error);
    return response.serverError({
      message: "封禁IP失败",
    }) as ApiResponse<BanIPResponse | null>;
  }
}

/**
 * 解封IP
 */
type UnbanIPResponse = { ip: string; unbanned: boolean };

export async function unbanIP(
  params: UnbanIP,
): Promise<ApiResponse<UnbanIPResponse | null>> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "unbanIP"))) {
    return response.tooManyRequests() as ApiResponse<UnbanIPResponse | null>;
  }

  const validationError = validateData(params, UnbanIPSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as ApiResponse<UnbanIPResponse | null>;

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: params.access_token,
  });

  if (!user) {
    return response.unauthorized() as ApiResponse<UnbanIPResponse | null>;
  }

  try {
    await ensureRedisConnection();

    const { ip } = params;
    // 使用新的 key 格式
    const banKey = `np:rate:ban:${ip}`;
    const deleted = await redis.del(banKey);

    return response.ok({
      data: { ip, unbanned: deleted > 0 },
    }) as ApiResponse<UnbanIPResponse | null>;
  } catch (error) {
    console.error("解封IP失败:", error);
    return response.serverError({
      message: "解封IP失败",
    }) as ApiResponse<UnbanIPResponse | null>;
  }
}

/**
 * 清除IP的速率限制记录
 */
type ClearRateLimitResponse = { ip: string; cleared: boolean };

export async function clearRateLimit(
  params: ClearRateLimit,
): Promise<ApiResponse<ClearRateLimitResponse | null>> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "clearRateLimit"))) {
    return response.tooManyRequests() as ApiResponse<ClearRateLimitResponse | null>;
  }

  const validationError = validateData(params, ClearRateLimitSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as ApiResponse<ClearRateLimitResponse | null>;

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: params.access_token,
  });

  if (!user) {
    return response.unauthorized() as ApiResponse<ClearRateLimitResponse | null>;
  }

  try {
    await ensureRedisConnection();

    const { ip } = params;
    // 使用新的 key 格式
    const key = `np:rate:ip:${ip}`;
    const deleted = await redis.del(key);

    return response.ok({
      data: { ip, cleared: deleted > 0 },
    }) as ApiResponse<ClearRateLimitResponse | null>;
  } catch (error) {
    console.error("清除速率限制失败:", error);
    return response.serverError({
      message: "清除速率限制失败",
    }) as ApiResponse<ClearRateLimitResponse | null>;
  }
}

/**
 * 获取API端点统计
 * 使用24小时滑动窗口统计
 */
type EndpointStatsResponse = {
  endpoints: EndpointStat[];
  totalRequests: number;
  timeRange: { start: number; end: number };
};

export async function getEndpointStats(
  params: GetEndpointStats,
): Promise<ApiResponse<EndpointStatsResponse | null>> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "getEndpointStats"))) {
    return response.tooManyRequests() as ApiResponse<EndpointStatsResponse | null>;
  }

  const validationError = validateData(params, GetEndpointStatsSchema);
  if (validationError)
    return response.badRequest(
      validationError,
    ) as ApiResponse<EndpointStatsResponse | null>;

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: params.access_token,
  });

  if (!user) {
    return response.unauthorized() as ApiResponse<EndpointStatsResponse | null>;
  }

  try {
    await ensureRedisConnection();

    const { hours = 24 } = params;
    const currentTime = Date.now();
    const startTime = currentTime - hours * 3600000;

    // 从 np:stat:endpoint ZSET 中获取所有在时间范围内的记录
    // 值格式: apiName:timestamp, 分数: timestamp
    const allRecords = await redis.zrangebyscore(
      "np:stat:endpoint",
      startTime,
      currentTime,
    );

    // 统计每个端点的调用次数
    const endpointCounts = new Map<string, number>();

    for (const record of allRecords) {
      // 记录格式: apiName:timestamp
      const lastColonIndex = record.lastIndexOf(":");
      if (lastColonIndex > 0) {
        const endpoint = record.substring(0, lastColonIndex);
        endpointCounts.set(endpoint, (endpointCounts.get(endpoint) || 0) + 1);
      }
    }

    let totalRequests = 0;
    for (const count of endpointCounts.values()) {
      totalRequests += count;
    }

    const endpoints: EndpointStat[] = Array.from(endpointCounts.entries())
      .map(([endpoint, count]) => ({
        endpoint,
        count,
        percentage: totalRequests > 0 ? (count / totalRequests) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return response.ok({
      data: {
        endpoints,
        totalRequests,
        timeRange: {
          start: startTime,
          end: currentTime,
        },
      },
    }) as ApiResponse<EndpointStatsResponse | null>;
  } catch (error) {
    console.error("获取端点统计失败:", error);
    return response.serverError({
      message: "获取端点统计失败",
    }) as ApiResponse<EndpointStatsResponse | null>;
  }
}

/**
 * 获取请求趋势
 */
export async function getRequestTrends(
  params: GetRequestTrends,
): Promise<ApiResponse<RequestTrendItem[] | null>> {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers(), "getRequestTrends"))) {
    return response.tooManyRequests() as ApiResponse<RequestTrendItem[] | null>;
  }

  const validationError = validateData(params, GetRequestTrendsSchema);
  if (validationError)
    return response.badRequest(validationError) as ApiResponse<
      RequestTrendItem[] | null
    >;

  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: params.access_token,
  });

  if (!user) {
    return response.unauthorized() as ApiResponse<RequestTrendItem[] | null>;
  }

  try {
    await ensureRedisConnection();

    const { hours = 24, granularity = "hour" } = params;
    const currentTime = Date.now();
    const currentHour = Math.floor(currentTime / 3600000);
    const trends: RequestTrendItem[] = [];

    if (granularity === "hour") {
      // 使用新的独立小时统计数据（成功 + 错误）
      for (let i = hours - 1; i >= 0; i--) {
        const targetHour = currentHour - i;
        const [successStr, errorStr] = await Promise.all([
          redis.get(`np:stat:hour:${targetHour}:success`),
          redis.get(`np:stat:hour:${targetHour}:error`),
        ]);
        const success = successStr ? parseInt(successStr, 10) : 0;
        const error = errorStr ? parseInt(errorStr, 10) : 0;
        const count = success + error;

        const hourTimestamp = targetHour * 3600000;
        const date = new Date(hourTimestamp);
        trends.push({
          time: `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, "0")}:00`,
          timestamp: hourTimestamp,
          count,
          success,
          error,
        });
      }
    } else {
      // 分钟级别统计使用 np:rate:ip:* 数据（保留24小时）
      const rateLimitKeys = await redis.keys("np:rate:ip:*");
      const effectiveMinutes = Math.min(hours * 60, 60);

      for (let i = effectiveMinutes - 1; i >= 0; i--) {
        const minuteTimestamp =
          Math.floor(currentTime / 60000) * 60000 - i * 60000;
        const minuteStart = minuteTimestamp;
        const minuteEnd = minuteTimestamp + 60000;

        let count = 0;
        for (const key of rateLimitKeys) {
          const keyCount = await redis.zcount(key, minuteStart, minuteEnd);
          count += keyCount;
        }

        const date = new Date(minuteTimestamp);
        trends.push({
          time: `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`,
          timestamp: minuteTimestamp,
          count,
        });
      }
    }

    return response.ok({
      data: trends,
    }) as ApiResponse<RequestTrendItem[] | null>;
  } catch (error) {
    console.error("获取请求趋势失败:", error);
    return response.serverError({
      message: "获取请求趋势失败",
    }) as ApiResponse<RequestTrendItem[] | null>;
  }
}
