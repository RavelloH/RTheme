export interface BlockContentHeader {
  value: string;
  description: string;
}

export interface BlockContentTitle {
  value: string;
  description: string;
}

export interface BlockContentBody {
  value: {
    top: string[];
    bottom: string[];
  };
  description: string;
}

export interface BlockContentFooter {
  value: {
    link: string;
    description: string;
  };
  description: string;
}

export interface BlockContent {
  header?: BlockContentHeader;
  title?: BlockContentTitle;
  content?: BlockContentBody;
  footer?: BlockContentFooter;
  [key: string]: unknown;
}

export interface BlockConfig {
  id: number | string;
  block?: string; // 默认为 "default"
  enabled: boolean;
  description?: string;
  content: BlockContent;
  data?: unknown; // 注入的数据，改为 unknown
}

export interface BlockProps {
  config: BlockConfig;
  data?: Record<string, unknown>; // 恢复 data 字段，使其可选，改为 unknown
}

// Fetcher 类型定义
export type BlockFetcher<T = unknown> = (config: BlockConfig) => Promise<T>;
