/**
 * Block 配置注册表（V2）
 * schema 来源统一切换到 blockCatalog
 */

import {
  getAllBlockSchemas,
  getBlockSchema,
  getRegisteredBlockTypes,
} from "@/blocks/core/catalog";
import type { BlockFormConfig } from "@/blocks/core/types/field-config";

const configCache = new Map<string, BlockFormConfig>();

export async function getBlockFormConfig(
  blockType: string,
): Promise<BlockFormConfig | null> {
  if (process.env.NODE_ENV !== "development" && configCache.has(blockType)) {
    return configCache.get(blockType)!;
  }

  const config = await getBlockSchema(blockType);
  if (!config) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[Block Registry] Unknown block type: ${blockType}`);
    }
    return null;
  }

  configCache.set(blockType, config);
  return config;
}

export async function getAllBlockFormConfigs(): Promise<BlockFormConfig[]> {
  if (process.env.NODE_ENV !== "development" && configCache.size > 0) {
    return Array.from(configCache.values());
  }

  const configs = await getAllBlockSchemas();
  if (process.env.NODE_ENV !== "development") {
    configs.forEach((config) => configCache.set(config.blockType, config));
  }

  return configs;
}

export { getRegisteredBlockTypes };

export function registerBlockFormConfig(config: BlockFormConfig): void {
  configCache.set(config.blockType, config);
}

export function clearBlockConfigCache(): void {
  configCache.clear();
}

export async function preloadBlockConfigs(): Promise<void> {
  await getAllBlockFormConfigs();
}
