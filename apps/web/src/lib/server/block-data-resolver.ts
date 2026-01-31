import type { BlockFetcher, BlockConfig } from "@/blocks/types";

// 页面配置最小接口（只需要 blocks 属性）
interface BlockPageConfig {
  blocks?: BlockConfig[];
  [key: string]: unknown;
}

// 保持映射表不变，但可以将类型定义简化
const fetcherLoaders: Record<string, () => Promise<BlockFetcher>> = {
  hero: () => import("@/blocks/HeroGallery/fetcher").then((m) => m.heroFetcher),
  posts: () =>
    import("@/blocks/RecentPosts/fetcher").then((m) => m.postsFetcher),
  projects: () =>
    import("@/blocks/RecentProjects/fetcher").then((m) => m.projectsFetcher),
  "tags-categories": () =>
    import("@/blocks/TagsCategories/fetcher").then(
      (m) => m.tagsCategoriesFetcher,
    ),
  default: () =>
    import("@/blocks/Default/fetcher").then((m) => m.defaultBlockFetcher),
};

/**
 * 解析单个 Block 的数据
 * 用于编辑器中动态添加新 Block 时获取数据
 */
export async function resolveSingleBlockData(
  block: BlockConfig,
): Promise<Record<string, unknown>> {
  const loadFetcher = fetcherLoaders[block.block || "default"];
  if (!loadFetcher) return {};

  try {
    const fetcher = await loadFetcher();
    const data = await fetcher(block);
    return (data as Record<string, unknown>) || {};
  } catch (error) {
    console.error(
      `[Single Block Fetch Error] Block: ${block.block}, ID: ${block.id}`,
      error,
    );
    return {};
  }
}

/**
 * 页面数据解析器 (已优化)
 * 并行加载 Fetcher 模块并请求数据
 */
export async function resolveBlockData(
  pageConfig: BlockPageConfig | null,
): Promise<BlockPageConfig | null> {
  // 1. 快速检查：如果没有 blocks，直接返回
  if (!pageConfig?.blocks?.length) {
    return pageConfig;
  }
  // 2. 并行处理所有 block
  const resolvedBlocks = await Promise.all(
    pageConfig.blocks.map(async (block) => {
      // 获取对应的 Loader，如果找不到则尝试 default，如果还没有则返回原 block
      const loadFetcher = fetcherLoaders[block.block || "default"];
      if (!loadFetcher) return block;
      try {
        // 并行流：动态导入模块 -> 执行 Fetch -> 返回新对象
        const fetcher = await loadFetcher();
        const data = await fetcher(block);
        return { ...block, data };
      } catch (error) {
        console.error(
          `[Data Fetch Error] Block: ${block.block}, ID: ${block.id}`,
          error,
        );
        // 出错降级：返回原始 block，不中断页面渲染
        return block;
      }
    }),
  );
  return { ...pageConfig, blocks: resolvedBlocks };
}
