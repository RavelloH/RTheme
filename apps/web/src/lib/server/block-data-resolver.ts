import type {
  BlockMode,
  ResolvedBlock,
  RuntimeBlockInput,
} from "@/blocks/core/definition";
import {
  resolveBlocksV2,
  resolveSingleBlockV2,
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
  mode: BlockMode = "editor",
): Promise<ResolvedBlock> {
  return resolveSingleBlockV2(block, pageContext, mode);
}

/**
 * 页面数据解析器（V2）
 */
export async function resolveBlockData(
  pageConfig: BlockPageConfig | null,
  mode: BlockMode = "page",
  pageContext?: Record<string, unknown>,
): Promise<ResolvedBlockPageConfig | null> {
  if (!pageConfig?.blocks?.length) {
    return pageConfig as ResolvedBlockPageConfig | null;
  }

  const pageContextData = pageContext ?? pageConfig.data ?? {};
  const resolvedBlocks = await resolveBlocksV2(
    pageConfig.blocks,
    pageContextData,
    mode,
  );

  return {
    ...pageConfig,
    blocks: resolvedBlocks,
  };
}
