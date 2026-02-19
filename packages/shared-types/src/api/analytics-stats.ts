import { z } from "zod";
import type { ApiResponse } from "./common.js";

/**
 * 获取访问统计请求参数
 */
export const GetAnalyticsStatsSchema = z
  .object({
    access_token: z.string().optional(),
    days: z.number().int().min(1).max(999).optional(), // 统计天数
    hours: z.number().int().min(1).max(168).optional(), // 统计小时数（最多7天）
    startDate: z.string().optional(), // 自定义开始日期 YYYY-MM-DD
    endDate: z.string().optional(), // 自定义结束日期 YYYY-MM-DD
    // 与 PageViewTable 对齐的全局筛选字段
    search: z.string().optional(),
    path: z.string().optional(),
    visitorId: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional(),
    city: z.string().optional(),
    deviceType: z.string().optional(),
    browser: z.string().optional(),
    os: z.string().optional(),
    timestampStart: z.string().optional(),
    timestampEnd: z.string().optional(),
  })
  .refine(
    (data) => {
      // 必须提供 days、hours 或者 (startDate + endDate) 之一
      return (
        data.days !== undefined ||
        data.hours !== undefined ||
        (data.startDate && data.endDate)
      );
    },
    {
      message: "必须提供 days、hours 或者 startDate/endDate",
    },
  );

export type GetAnalyticsStats = z.infer<typeof GetAnalyticsStatsSchema>;

/**
 * 统计项 (用于各种维度的统计)
 */
export interface StatItem {
  name: string;
  count: number;
  percentage: number;
}

/**
 * 每日趋势数据
 */
export interface DailyTrend {
  date: string; // YYYY-MM-DD
  views: number;
  uniqueVisitors: number;
}

/**
 * 每日路径趋势数据（用于堆叠柱状图）
 */
export interface DailyPathTrend {
  date: string; // YYYY-MM-DD
  pathViews: Record<string, number>; // 每个路径的访问量
}

/**
 * 路径访问统计
 */
export interface PathStat {
  path: string;
  count: number;
  percentage: number;
}

/**
 * 访问统计概览
 */
export interface AnalyticsOverview {
  totalViews: number; // 总访问量
  uniqueVisitors: number; // 独立访客数
  todayViews: number; // 今日访问
  averageViews: number; // 日均访问
  totalSessions: number; // 总会话数
  averageDuration: number; // 平均停留时长（秒）
  bounceRate: number; // 跳出率（百分比）
  pageViewsPerSession: number; // 每会话页面浏览量
}

/**
 * 访问统计响应数据
 */
export interface AnalyticsStatsData {
  overview: AnalyticsOverview;
  dailyTrend: DailyTrend[]; // 每日趋势
  dailyPathTrend: DailyPathTrend[]; // 每日路径趋势
  topPaths: PathStat[]; // 热门路径 Top 20
  countries: StatItem[]; // 国家统计
  regions: StatItem[]; // 地区统计
  cities: StatItem[]; // 城市统计
  devices: StatItem[]; // 设备类型统计
  browsers: StatItem[]; // 浏览器统计
  os: StatItem[]; // 操作系统统计
  referers: StatItem[]; // 来源统计
  screenSizes: StatItem[]; // 屏幕尺寸统计
  languages: StatItem[]; // 语言统计
  timezones: StatItem[]; // 时区统计
}

/**
 * 获取访问统计响应
 */
export type GetAnalyticsStatsResponse = ApiResponse<AnalyticsStatsData>;

/**
 * 实时访问数据点（按分钟统计）
 */
export interface RealTimeDataPoint {
  time: string; // ISO 8601 格式的时间戳，精确到分钟
  views: number; // 该分钟的访问量
  visitors: number; // 该分钟的独立访客数
}

/**
 * 获取实时访问数据请求参数
 */
export const GetRealTimeStatsSchema = z.object({
  access_token: z.string().optional(),
  minutes: z.number().int().min(1).max(60).optional().default(30), // 统计分钟数，默认30分钟
  search: z.string().optional(),
  path: z.string().optional(),
  visitorId: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  deviceType: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  timestampStart: z.string().optional(),
  timestampEnd: z.string().optional(),
});

export type GetRealTimeStats = z.infer<typeof GetRealTimeStatsSchema>;

/**
 * 实时访问统计数据
 */
export interface RealTimeStatsData {
  dataPoints: RealTimeDataPoint[]; // 每分钟的访问数据
  totalViews: number; // 总访问量
  uniqueVisitors: number; // 独立访客数
}

/**
 * 获取实时访问统计响应
 */
export type GetRealTimeStatsResponse = ApiResponse<RealTimeStatsData>;
