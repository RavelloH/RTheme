import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getBlockDefinition } from "@/blocks/core/catalog";
import type {
  BlockRuntimeContext,
  ResolvedBlock,
  RuntimeBlockInput,
} from "@/blocks/core/definition";
import { extractParsedPlaceholdersFromValue } from "@/blocks/core/lib/shared";
import { resolveSingleBlock } from "@/blocks/core/runtime/pipeline";

type BlockPageContext = Record<string, unknown> | undefined;

export interface BlockCacheContext {
  pageId?: string;
  pageContext?: BlockPageContext;
}

export interface ResolveSingleBlockWithCacheParams extends BlockCacheContext {
  block: RuntimeBlockInput;
  disableCache?: boolean;
}

export interface BuildPageCacheTagsParams {
  pageId: string;
  blocks: RuntimeBlockInput[];
  pageContext?: BlockPageContext;
}

const PLACEHOLDER_TAG_MAP: Record<string, readonly string[]> = {
  posts: ["posts"],
  postsList: ["posts"],
  postsListPage: ["posts"],
  postsListTotalPage: ["posts"],
  postsListFirstPage: ["posts"],
  postsListLastPage: ["posts"],
  firstPublishAt: ["posts"],
  lastPublishDays: ["posts"],

  categories: ["categories"],
  rootCategories: ["categories"],
  childCategories: ["categories"],
  categoriesList: ["categories"],

  tags: ["tags", "posts"],
  tagsList: ["tags", "posts"],

  category: ["categories", "posts"],
  categoryName: ["categories", "posts"],
  categoryDescription: ["categories", "posts"],
  categorySubcategoryCount: ["categories", "posts"],
  categoryPostCount: ["categories", "posts"],
  categoryPage: ["categories", "posts"],
  categoryTotalPage: ["categories", "posts"],
  categoryFirstPage: ["categories", "posts"],
  categoryLastPage: ["categories", "posts"],

  tag: ["tags", "posts"],
  tagName: ["tags", "posts"],
  tagDescription: ["tags", "posts"],
  tagPostCount: ["tags", "posts"],
  tagPage: ["tags", "posts"],
  tagTotalPage: ["tags", "posts"],
  tagFirstPage: ["tags", "posts"],
  tagLastPage: ["tags", "posts"],

  projects: ["projects"],
  projectsList: ["projects"],

  friends: ["friend-links"],
  friendsList: ["friend-links"],

  pageInfo: ["categories", "tags"],
};

function addTags(target: Set<string>, tags: Iterable<string>): void {
  for (const tag of tags) {
    if (tag) {
      target.add(tag);
    }
  }
}

function normalizeTagList(
  value: readonly string[] | undefined,
): readonly string[] {
  if (!value?.length) {
    return [];
  }

  const tags = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();
    if (trimmed) {
      tags.add(trimmed);
    }
  }

  return Array.from(tags);
}

function getDefinitionDependencyTags(params: {
  block: RuntimeBlockInput;
  pageContext?: BlockPageContext;
}): readonly string[] {
  const definition = getBlockDefinition(params.block.block || "default");
  const resolver = definition?.cache?.tags;
  if (!resolver) {
    return [];
  }

  const context: BlockRuntimeContext = {
    ...(params.pageContext ?? {}),
  };

  try {
    const resolved =
      typeof resolver === "function"
        ? resolver({
            block: params.block,
            content: params.block.content,
            context,
          })
        : resolver;

    return normalizeTagList(resolved);
  } catch (error) {
    console.error(
      `[BlockCache] Failed to resolve cache tags for block type "${params.block.block}"`,
      error,
    );
    return [];
  }
}

function getPlaceholderDependencyTags(content: unknown): readonly string[] {
  const tags = new Set<string>();
  const placeholders = extractParsedPlaceholdersFromValue(content);

  for (const placeholder of placeholders) {
    const mapped = PLACEHOLDER_TAG_MAP[placeholder.name];
    if (mapped) {
      addTags(tags, mapped);
    }
  }

  return Array.from(tags);
}

function getBlockDependencyTags(params: {
  block: RuntimeBlockInput;
  pageContext?: BlockPageContext;
}): readonly string[] {
  const tags = new Set<string>();

  addTags(tags, getDefinitionDependencyTags(params));
  addTags(tags, getPlaceholderDependencyTags(params.block.content));

  const definition = getBlockDefinition(params.block.block || "default");
  if (definition?.capabilities.media?.length) {
    tags.add("photos");
  }

  return Array.from(tags);
}

export function getBlockCacheTags(params: {
  block: RuntimeBlockInput;
  pageId?: string;
  pageContext?: BlockPageContext;
}): string[] {
  const tags = new Set<string>();
  const blockId = String(params.block.id);

  if (params.pageId) {
    tags.add(`pages/${params.pageId}`);
    tags.add(`block/${params.pageId}/${blockId}`);
  }

  addTags(
    tags,
    getBlockDependencyTags({
      block: params.block,
      pageContext: params.pageContext,
    }),
  );

  return Array.from(tags);
}

export function buildPageCacheTagsForBlocks(
  params: BuildPageCacheTagsParams,
): string[] {
  const tags = new Set<string>([`pages/${params.pageId}`]);

  for (const block of params.blocks) {
    addTags(
      tags,
      getBlockDependencyTags({
        block,
        pageContext: params.pageContext,
      }),
    );
  }

  return Array.from(tags);
}

async function resolveSingleBlockCached(params: {
  block: RuntimeBlockInput;
  pageId: string;
  pageContext?: BlockPageContext;
}): Promise<ResolvedBlock> {
  "use cache";

  const tags = getBlockCacheTags({
    block: params.block,
    pageId: params.pageId,
    pageContext: params.pageContext,
  });
  if (tags.length > 0) {
    cacheTag(...tags);
  }
  cacheLife("max");

  return resolveSingleBlock(params.block, params.pageContext);
}

export async function resolveSingleBlockWithCache(
  params: ResolveSingleBlockWithCacheParams,
): Promise<ResolvedBlock> {
  if (params.disableCache || !params.pageId) {
    return resolveSingleBlock(params.block, params.pageContext);
  }

  return resolveSingleBlockCached({
    block: params.block,
    pageId: params.pageId,
    pageContext: params.pageContext,
  });
}
