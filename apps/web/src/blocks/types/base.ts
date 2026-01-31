// 基础类型定义 - 简化版（移除 value/description 包装）

export type BlockContentHeader = string;

export type BlockContentTitle = string;

export interface BlockContentBody {
  top: string[];
  bottom: string[];
}

export interface BlockContentFooter {
  link: string;
  text: string; // 原 description，现更名为 text 表示链接文本
}

// 通用基础 Config 接口
export interface BaseBlockConfig {
  id: number | string;
  description?: string; // 区块实例的描述（如"首页Hero"）保留
  data?: unknown;
}

// 通用 Props 接口
export interface BaseBlockProps<T extends BaseBlockConfig = BaseBlockConfig> {
  config: T;
  data?: Record<string, unknown>;
}

// Block 类型映射：将 type 字符串映射到对应的 Config 类型
import type { DefaultBlockConfig } from "../Default/types";
import type { HeroBlockConfig } from "../HeroGallery/types";
import type { ProjectsBlockConfig } from "../RecentProjects/types";
import type { PostsBlockConfig } from "../RecentPosts/types";
import type { TagsCategoriesBlockConfig } from "../TagsCategories/types";

export interface BlockTypeMap {
  default: DefaultBlockConfig;
  hero: HeroBlockConfig;
  projects: ProjectsBlockConfig;
  posts: PostsBlockConfig;
  "tags-categories": TagsCategoriesBlockConfig;
}

// 提取所有 block type
export type BlockType = keyof BlockTypeMap;

// 根据类型获取对应的 Config
export type BlockConfigForType<T extends BlockType> = BlockTypeMap[T];

// 获取所有 Config 的联合类型
export type AllBlockConfigs = BlockTypeMap[BlockType];
