import type {
  AllBlockConfigs,
  BaseBlockProps,
  BlockConfigForType,
  BlockType,
} from "@/blocks/core/types/base";

export type * from "./types/base";

// 导出所有子类型，方便直接引用
export type {
  DefaultBlockConfig,
  DefaultBlockContent,
} from "../collection/Default/types";
export type {
  HeroBlockConfig,
  HeroBlockContent,
} from "../collection/HeroGallery/types";
export type {
  PostsBlockConfig,
  PostsBlockContent,
} from "../collection/RecentPosts/types";
export type {
  ProjectsBlockConfig,
  ProjectsBlockContent,
} from "../collection/RecentProjects/types";
export type {
  TagsCategoriesBlockConfig,
  TagsCategoriesBlockContent,
} from "../collection/TagsCategories/types";

// 使用 AllBlockConfigs 作为 BlockConfig（向后兼容）
export type BlockConfig = AllBlockConfigs;

// Fetcher 类型定义
export type BlockFetcher<T = unknown> = (config: BlockConfig) => Promise<T>;

// BlockProps 用于组件接收
export interface BlockProps {
  config: BlockConfig;
  data?: Record<string, unknown>;
}

// 类型安全的组件映射
export type BlockComponentMap = {
  [K in BlockType]: React.ComponentType<BaseBlockProps<BlockConfigForType<K>>>;
};

// 导出服务端工具函数
export {
  fetchBlockInterpolatedData,
  processImageField,
  processImageArrayField,
  processImageFields,
} from "./lib/server";
