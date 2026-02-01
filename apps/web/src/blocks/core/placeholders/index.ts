/**
 * 插值器索引
 * 导出所有可用的插值器
 */

export { postsInterpolator } from "./posts";
export { projectsInterpolator } from "./projects";

/**
 * 插值器类型定义
 */
export type Interpolator = () => Promise<Record<string, unknown>>;

/**
 * 插值器加载器类型
 */
export type InterpolatorLoader = () => Promise<{ [key: string]: Interpolator }>;

/**
 * 插值器映射表
 * key: 占位符名称（不含花括号）
 * value: 返回该数据的插值器函数加载器
 */
export const interpolatorMap: Record<string, InterpolatorLoader> = {
  posts: () => import("./posts"),
  projects: () => import("./projects"),
};
