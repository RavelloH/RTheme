import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface FriendLinksBlockContent {
  /** 显示数量；0 或留空表示显示全部 */
  limit?: number;
  /** 分组筛选；留空表示显示全部分组 */
  group?: string;
  /** 是否启用组内随机排序 */
  random?: boolean;
  [key: string]: unknown;
}

export interface FriendLinkItem {
  id: number;
  name: string;
  url: string;
  avatar: string | null;
  slogan: string | null;
  group: string | null;
  order: number;
  domain: string;
}

export interface FriendLinksData {
  links: FriendLinkItem[];
  total: number;
  groupFilter: string | null;
  randomEnabled: boolean;
  limit: number | null;
}

export interface FriendLinksBlockConfig extends BaseBlockConfig {
  block: "friend-links";
  content: FriendLinksBlockContent;
}
