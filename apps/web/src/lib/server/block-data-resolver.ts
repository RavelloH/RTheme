import type {
  ResolvedBlock,
  RuntimeBlockInput,
} from "@/blocks/core/definition";
import { resolveSingleBlock } from "@/blocks/core/runtime/pipeline";
import { resolveSingleBlockWithCache } from "@/lib/server/block-cache";

interface BlockPageConfig {
  blocks?: RuntimeBlockInput[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResolvedBlockPageConfig
  extends Omit<BlockPageConfig, "blocks"> {
  blocks?: ResolvedBlock[];
}

interface ResolveBlockDataOptions {
  pageId?: string;
  disableCache?: boolean;
}

/**
 * 解析单个 Block 的数据（编辑器预览）
 */
export async function resolveSingleBlockData(
  block: RuntimeBlockInput,
  pageContext?: Record<string, unknown>,
): Promise<ResolvedBlock> {
  return resolveSingleBlock(block, pageContext);
}

/**
 * 页面数据解析器
 */
export async function resolveBlockData(
  pageConfig: BlockPageConfig | null,
  pageContext?: Record<string, unknown>,
  options: ResolveBlockDataOptions = {},
): Promise<ResolvedBlockPageConfig | null> {
  if (!pageConfig?.blocks?.length) {
    return pageConfig as ResolvedBlockPageConfig | null;
  }

  const pageContextData = pageContext ?? pageConfig.data ?? {};
  const resolvedBlocks = await Promise.all(
    pageConfig.blocks.map((block) =>
      resolveSingleBlockWithCache({
        block,
        pageId: options.pageId,
        pageContext: pageContextData,
        disableCache: options.disableCache,
      }),
    ),
  );

  return {
    ...pageConfig,
    blocks: resolvedBlocks,
  };
}
