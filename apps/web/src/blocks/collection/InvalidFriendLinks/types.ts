import type { BaseBlockConfig } from "@/blocks/core/types/base";

export type InvalidFriendReason = "DISCONNECT" | "NO_BACKLINK";

export interface InvalidFriendLinksBlockContent {
  /** 列表上方标题文本 */
  headerText?: string;
  /** 显示数量，0 或留空表示显示全部 */
  limit?: number;
  /** 是否显示为超链接，默认 false */
  showAsLink?: boolean;
  /** 是否显示有效时间，默认 true */
  showDuration?: boolean;
  [key: string]: unknown;
}

export interface InvalidFriendLinkItem {
  id: number;
  name: string;
  url: string;
  reason: InvalidFriendReason;
  reasonText: string;
  lastCheckedAt: string | null;
  validDuration: string | null;
}

export interface InvalidFriendLinksData {
  links: InvalidFriendLinkItem[];
  total: number;
}

export interface InvalidFriendLinksBlockConfig extends BaseBlockConfig {
  block: "invalid-friend-links";
  content: InvalidFriendLinksBlockContent;
}
