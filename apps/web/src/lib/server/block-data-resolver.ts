import type { BlockConfig, BlockFetcher } from "@/blocks/core/types";

// 页面配置最小接口（只需要 blocks 属性）
interface BlockPageConfig {
  blocks?: BlockConfig[];
  [key: string]: unknown;
}

// 保持映射表不变，但可以将类型定义简化
const fetcherLoaders: Record<string, () => Promise<BlockFetcher>> = {
  hero: () =>
    import("@/blocks/collection/HeroGallery/fetcher").then(
      (m) => m.heroFetcher,
    ),
  posts: () =>
    import("@/blocks/collection/RecentPosts/fetcher").then(
      (m) => m.postsFetcher,
    ),
  projects: () =>
    import("@/blocks/collection/RecentProjects/fetcher").then(
      (m) => m.projectsFetcher,
    ),
  "tags-categories": () =>
    import("@/blocks/collection/TagsCategories/fetcher").then(
      (m) => m.tagsCategoriesFetcher,
    ),
  default: () =>
    import("@/blocks/collection/Default/fetcher").then(
      (m) => m.defaultBlockFetcher,
    ),
  accordion: () =>
    import("@/blocks/collection/Accordion/fetcher").then(
      (m) => m.accordionFetcher,
    ),
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

  // 获取页面级全局数据（包含路由参数，如 page, slug, url）
  const pageContextData = (pageConfig.data as Record<string, unknown>) || {};

  // 2. 并行处理所有 block
  const resolvedBlocks = await Promise.all(
    pageConfig.blocks.map(async (block) => {
      // 获取对应的 Loader，如果找不到则尝试 default，如果还没有则返回原 block
      const loadFetcher = fetcherLoaders[block.block || "default"];
      if (!loadFetcher) return block;
      try {
        // 构造带有上下文数据的 Block 配置
        // 这样 Fetcher 就可以通过 config.data 访问到 page, slug 等参数了
        const blockWithContext = {
          ...block,
          data: {
            ...(block.data as Record<string, unknown>),
            ...pageContextData,
          },
        };

        // 并行流：动态导入模块 -> 执行 Fetch -> 返回新对象

        const fetcher = await loadFetcher();

        const fetchedData = await fetcher(blockWithContext);

        // 确保 fetchedData 是一个对象，否则默认为空对象

        const safeFetchedData =
          typeof fetchedData === "object" && fetchedData !== null
            ? (fetchedData as Record<string, unknown>)
            : {};

        // 合并 fetcher 返回的数据，保留上下文数据以便前端也能使用（如果需要）

        return {
          ...block,

          data: {
            ...pageContextData, // 保留上下文

            ...safeFetchedData, // Fetcher 返回的数据优先级更高（覆盖）
          },
        };
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
