// 基础类型定义 - 简化版（移除 value/description 包装）

export type BlockAlign = "left" | "center" | "right";

export interface BlockContentHeader {
  value: string;
  align?: BlockAlign;
}

export interface BlockContentTitle {
  value: string;
  align?: BlockAlign;
}

export interface BlockContentSection {
  value: string[];
  align?: BlockAlign;
}

export interface BlockContentBody {
  top: BlockContentSection;
  bottom: BlockContentSection;
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
import type { DefaultBlockConfig } from "@/blocks/collection/Default/types";
import type { HeroBlockConfig } from "@/blocks/collection/HeroGallery/types";
import type { PostsBlockConfig } from "@/blocks/collection/RecentPosts/types";
import type { ProjectsBlockConfig } from "@/blocks/collection/RecentProjects/types";
import type { TagsCategoriesBlockConfig } from "@/blocks/collection/TagsCategories/types";

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
