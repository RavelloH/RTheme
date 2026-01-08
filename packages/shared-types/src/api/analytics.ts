import { z } from "zod";
import type { ApiResponse } from "./common.js";

/**
 * 追踪页面浏览请求参数
 */
export const TrackPageViewSchema = z.object({
  path: z.string().max(500),
  referer: z.string().max(500).optional().nullable(),
  visitorId: z.string().max(100),
  screenSize: z.string().max(20).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
  timezone: z.string().max(50).optional().nullable(),
});

export type TrackPageView = z.infer<typeof TrackPageViewSchema>;

/**
 * 追踪页面浏览响应
 */
export type TrackPageViewResponse = ApiResponse<null>;

/**
 * 获取页面浏览记录请求参数
 */
export const GetPageViewsSchema = z.object({
  access_token: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  sortBy: z
    .enum(["id", "timestamp", "path", "visitorId", "country", "city"])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
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

export type GetPageViews = z.infer<typeof GetPageViewsSchema>;

/**
 * 页面浏览记录项
 */
export interface PageViewItem {
  id: number;
  timestamp: Date | string;
  path: string;
  visitorId: string;
  ipAddress: string;
  referer: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  screenSize: string | null;
  language: string | null;
  timezone: string | null;
}

/**
 * 获取页面浏览记录响应
 */
export type GetPageViewsResponse = ApiResponse<PageViewItem[]>;
