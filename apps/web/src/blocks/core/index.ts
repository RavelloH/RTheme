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
export type {
  MultiRowLayoutBlockConfig,
  MultiRowLayoutBlockContent,
} from "../collection/MultiRowLayout/types";

// 导出服务端工具函数
export {
  fetchBlockInterpolatedData,
  processImageField,
  processImageArrayField,
  processImageFields,
} from "./lib/server";
