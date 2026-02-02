import "server-only";

import type { BlockConfig } from "@/blocks/core/types";

/**
 * 规范化 blocks 的 ID，按照显示顺序重新分配递增的 ID，并移除 data 字段
 * @param config 页面配置对象
 * @returns 处理后的配置对象（不修改原对象）
 *
 * @example
 * 输入:
 * {
 *   blocks: [
 *     { id: 123, block: "hero", data: {...}, ... },
 *     { id: 999, block: "text", ... },
 *   ]
 * }
 *
 * 输出:
 * {
 *   blocks: [
 *     { id: 1, block: "hero", ... }, // data 被移除
 *     { id: 2, block: "text", ... },
 *   ]
 * }
 */
export function normalizeBlockIds(
  config: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!config || typeof config !== "object") {
    return config;
  }

  // 深拷贝 config，避免修改原对象
  const normalizedConfig = JSON.parse(JSON.stringify(config));

  // 检查是否有 blocks 字段且是数组
  if (
    !("blocks" in normalizedConfig) ||
    !Array.isArray(normalizedConfig.blocks)
  ) {
    return normalizedConfig;
  }

  // 重新分配 block ID 并移除 data 字段（data 应由 fetcher 在运行时获取，不应存入数据库）
  normalizedConfig.blocks = (normalizedConfig.blocks as BlockConfig[]).map(
    (block, index) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, ...rest } = block;
      return {
        ...rest,
        id: index + 1, // 从 1 开始的递增 ID
      };
    },
  );

  return normalizedConfig;
}
