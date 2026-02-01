/**
 * Block 配置注册表
 * 集中管理所有区块类型的表单配置
 *
 * 支持开发环境下的热重载
 */

import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * 动态导入所有 Block Schema
 * 在开发环境下支持模块热重载
 */
async function loadBlockFormConfigs(): Promise<
  Record<string, BlockFormConfig>
> {
  const configs: Record<string, BlockFormConfig> = {};

  try {
    const [defaultConfig, projectsConfig, heroConfig, postsConfig, tagsConfig] =
      await Promise.all([
        import("../collection/Default/schema").then(
          (m) => m.DEFAULT_BLOCK_FORM_CONFIG,
        ),
        import("../collection/RecentProjects/schema").then(
          (m) => m.PROJECTS_BLOCK_FORM_CONFIG,
        ),
        import("../collection/HeroGallery/schema").then(
          (m) => m.HERO_BLOCK_FORM_CONFIG,
        ),
        import("../collection/RecentPosts/schema").then(
          (m) => m.POSTS_BLOCK_FORM_CONFIG,
        ),
        import("../collection/TagsCategories/schema").then(
          (m) => m.TAGS_CATEGORIES_BLOCK_FORM_CONFIG,
        ),
      ]);

    configs.default = defaultConfig;
    configs.projects = projectsConfig;
    configs.hero = heroConfig;
    configs.posts = postsConfig;
    configs["tags-categories"] = tagsConfig;
  } catch (error) {
    console.error("Failed to load block form configs:", error);
  }

  return configs;
}

// 缓存已加载的配置
let cachedConfigs: Record<string, BlockFormConfig> | null = null;

/**
 * 获取指定 block 类型的表单配置
 * 开发环境下每次都重新加载以支持热重载
 */
export async function getBlockFormConfig(
  blockType: string,
): Promise<BlockFormConfig | null> {
  // 开发环境：每次重新加载以支持热重载
  if (process.env.NODE_ENV === "development" || !cachedConfigs) {
    cachedConfigs = await loadBlockFormConfigs();
  }

  return cachedConfigs[blockType] || null;
}

/**
 * 获取所有 block 类型的表单配置
 */
export async function getAllBlockFormConfigs(): Promise<BlockFormConfig[]> {
  if (process.env.NODE_ENV === "development" || !cachedConfigs) {
    cachedConfigs = await loadBlockFormConfigs();
  }
  return Object.values(cachedConfigs);
}

/**
 * 同步版本（用于兼容旧代码）
 * @deprecated 使用异步版本 getBlockFormConfig 以支持热重载
 */
export function getBlockFormConfigSync(
  blockType: string,
): BlockFormConfig | null {
  if (!cachedConfigs) {
    console.warn(
      "[Block Registry] Configs not loaded. Use getBlockFormConfig() instead.",
    );
    return null;
  }
  return cachedConfigs[blockType] || null;
}

/**
 * 获取所有已注册的 block 类型
 */
export async function getRegisteredBlockTypes(): Promise<string[]> {
  if (process.env.NODE_ENV === "development" || !cachedConfigs) {
    cachedConfigs = await loadBlockFormConfigs();
  }
  return Object.keys(cachedConfigs);
}

/**
 * 注册新的 block 配置（用于动态扩展）
 */
export function registerBlockFormConfig(config: BlockFormConfig): void {
  if (!cachedConfigs) {
    cachedConfigs = {};
  }
  cachedConfigs[config.blockType] = config;
}

/**
 * 预加载配置（在应用启动时调用）
 */
export async function preloadBlockConfigs(): Promise<void> {
  cachedConfigs = await loadBlockFormConfigs();
}
