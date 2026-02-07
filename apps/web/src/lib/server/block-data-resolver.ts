import type {
  ResolvedBlock,
  RuntimeBlockInput,
} from "@/blocks/core/definition";
import {
  resolveBlocks,
  resolveSingleBlock,
} from "@/blocks/core/runtime/pipeline";

interface BlockPageConfig {
  blocks?: RuntimeBlockInput[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResolvedBlockPageConfig
  extends Omit<BlockPageConfig, "blocks"> {
  blocks?: ResolvedBlock[];
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
): Promise<ResolvedBlockPageConfig | null> {
  if (!pageConfig?.blocks?.length) {
    return pageConfig as ResolvedBlockPageConfig | null;
  }

  const pageContextData = pageContext ?? pageConfig.data ?? {};
  const resolvedBlocks = await resolveBlocks(
    pageConfig.blocks,
    pageContextData,
  );

  return {
    ...pageConfig,
    blocks: resolvedBlocks,
  };
}
