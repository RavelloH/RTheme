/**
 * Block 配置注册表
 * 集中管理所有区块类型的表单配置
 *
 * 支持开发环境下的热重载和按需加载
 */

import type { BlockFormConfig } from "@/blocks/core/types/field-config";

/**
 * Schema 导入器映射表
 * 每个区块类型对应一个动态导入函数
 */
const SCHEMA_IMPORTERS: Record<string, () => Promise<BlockFormConfig>> = {
  default: () =>
    import("../collection/Default/schema").then(
      (m) => m.DEFAULT_BLOCK_FORM_CONFIG,
    ),
  projects: () =>
    import("../collection/RecentProjects/schema").then(
      (m) => m.PROJECTS_BLOCK_FORM_CONFIG,
    ),
  hero: () =>
    import("../collection/HeroGallery/schema").then(
      (m) => m.HERO_BLOCK_FORM_CONFIG,
    ),
  posts: () =>
    import("../collection/RecentPosts/schema").then(
      (m) => m.POSTS_BLOCK_FORM_CONFIG,
    ),
  "tags-categories": () =>
    import("../collection/TagsCategories/schema").then(
      (m) => m.TAGS_CATEGORIES_BLOCK_FORM_CONFIG,
    ),
  accordion: () =>
    import("../collection/Accordion/schema").then(
      (m) => m.ACCORDION_BLOCK_FORM_CONFIG,
    ),
  "paged-posts": () =>
    import("../collection/PagedPosts/schema").then(
      (m) => m.PAGED_POSTS_BLOCK_FORM_CONFIG,
    ),
  pagination: () =>
    import("../collection/Pagination/schema").then(
      (m) => m.PAGINATION_BLOCK_FORM_CONFIG,
    ),
};

/**
 * 单个配置的缓存
 * 按需缓存，只在需要时加载和缓存
 */
const configCache = new Map<string, BlockFormConfig>();

/**
 * 获取指定 block 类型的表单配置（按需加载）
 * 开发环境下支持热重载
 */
export async function getBlockFormConfig(
  blockType: string,
): Promise<BlockFormConfig | null> {
  const importer = SCHEMA_IMPORTERS[blockType];
  if (!importer) {
    console.warn(`[Block Registry] Unknown block type: ${blockType}`);
    return null;
  }

  // 开发环境：每次都重新加载以支持热重载
  if (process.env.NODE_ENV === "development") {
    try {
      const config = await importer();
      configCache.set(blockType, config);
      return config;
    } catch (error) {
      console.error(
        `[Block Registry] Failed to load config for ${blockType}:`,
        error,
      );
      return null;
    }
  }

  // 生产环境：使用缓存
  if (configCache.has(blockType)) {
    return configCache.get(blockType)!;
  }

  // 按需加载并缓存
  try {
    const config = await importer();
    configCache.set(blockType, config);
    return config;
  } catch (error) {
    console.error(
      `[Block Registry] Failed to load config for ${blockType}:`,
      error,
    );
    return null;
  }
}

/**
 * 获取所有 block 类型的表单配置
 * 仅用于 BlockLibrary 等需要显示所有可用 block 的场景
 * 注意：此函数会加载所有 block schema
 */
export async function getAllBlockFormConfigs(): Promise<BlockFormConfig[]> {
  const blockTypes = Object.keys(SCHEMA_IMPORTERS);
  const configs: BlockFormConfig[] = [];

  for (const blockType of blockTypes) {
    const config = await getBlockFormConfig(blockType);
    if (config) {
      configs.push(config);
    }
  }

  return configs;
}

/**
 * 获取所有已注册的 block 类型
 */
export function getRegisteredBlockTypes(): string[] {
  return Object.keys(SCHEMA_IMPORTERS);
}

/**
 * 注册新的 block 配置（用于动态扩展）
 */
export function registerBlockFormConfig(config: BlockFormConfig): void {
  configCache.set(config.blockType, config);
}

/**
 * 清除缓存（用于开发环境热重载）
 */
export function clearBlockConfigCache(): void {
  configCache.clear();
}

/**
 * 预加载配置（在应用启动时调用）
 * 注意：此函数会加载所有 block schema，谨慎使用
 */
export async function preloadBlockConfigs(): Promise<void> {
  await getAllBlockFormConfigs();
}
