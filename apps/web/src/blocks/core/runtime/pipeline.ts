import { getBlockDefinition } from "@/blocks/core/catalog";
import { loadBlockBusinessFetcher } from "@/blocks/core/catalog-server";
import {
  type BlockMode,
  type BlockRuntimeErrorItem,
  type ResolvedBlock,
  type RuntimeBlockInput,
} from "@/blocks/core/definition";
import {
  createEmptyRuntimeEnvelope,
  normalizeRuntimeContext,
} from "@/blocks/core/runtime/envelope";
import {
  type BlockRuntimeStage,
  toRuntimeErrorItem,
  wrapRuntimeError,
} from "@/blocks/core/runtime/errors";
import { resolveBlockMedia } from "@/blocks/core/runtime/media";
import { resolveBlockPlaceholders } from "@/blocks/core/runtime/placeholders";

function shouldThrowRuntimeError(): boolean {
  return process.env.NODE_ENV !== "production";
}

function appendRuntimeError(
  errors: BlockRuntimeErrorItem[],
  errorItem: BlockRuntimeErrorItem,
): void {
  errors.push(errorItem);
}

function toSafeContent<TContent>(content: unknown): TContent {
  return (content ?? {}) as TContent;
}

async function runStage<T>(params: {
  stage: BlockRuntimeStage;
  blockType: string;
  blockId: string | number;
  task: () => Promise<T>;
  errors: BlockRuntimeErrorItem[];
  fallback: T;
}): Promise<T> {
  try {
    return await params.task();
  } catch (error) {
    const runtimeError = wrapRuntimeError({
      code: `BLOCK_${params.stage.toUpperCase()}_FAILED`,
      stage: params.stage,
      blockType: params.blockType,
      blockId: params.blockId,
      message: `Block ${params.blockType} (${params.blockId}) 在 ${params.stage} 阶段处理失败`,
      cause: error,
    });

    if (shouldThrowRuntimeError()) {
      throw runtimeError;
    }

    appendRuntimeError(params.errors, toRuntimeErrorItem(runtimeError));
    return params.fallback;
  }
}

export async function resolveSingleBlockV2(
  block: RuntimeBlockInput,
  pageContext?: Record<string, unknown>,
  mode: BlockMode = "page",
): Promise<ResolvedBlock> {
  const blockType = block.block || "default";
  const definition = getBlockDefinition(blockType);

  const runtimeErrors: BlockRuntimeErrorItem[] = [];

  if (!definition) {
    const runtimeError = wrapRuntimeError({
      code: "BLOCK_DEFINITION_NOT_FOUND",
      stage: "definition",
      blockType,
      blockId: block.id,
      message: `未找到 block type=${blockType} 的定义`,
    });

    if (shouldThrowRuntimeError()) {
      throw runtimeError;
    }

    const runtime = createEmptyRuntimeEnvelope<unknown>(
      normalizeRuntimeContext(pageContext),
    );
    runtime.meta.status = "error";
    runtime.meta.errors = [toRuntimeErrorItem(runtimeError)];

    return {
      id: block.id,
      block: blockType,
      description: block.description,
      content: block.content,
      runtime,
    };
  }

  const context =
    definition.capabilities.context === "none"
      ? {}
      : normalizeRuntimeContext(pageContext);

  const runtime = createEmptyRuntimeEnvelope<unknown>(context);

  const normalizedContent = await runStage({
    stage: "content",
    blockType,
    blockId: block.id,
    errors: runtimeErrors,
    fallback: toSafeContent(block.content),
    task: async () => {
      if (definition.normalizeContent) {
        return definition.normalizeContent(block.content);
      }

      return toSafeContent(block.content);
    },
  });

  runtime.placeholders = await runStage({
    stage: "placeholders",
    blockType,
    blockId: block.id,
    errors: runtimeErrors,
    fallback: {},
    task: async () => {
      const placeholderCaps = definition.capabilities.placeholders;
      if (!placeholderCaps?.enabled) {
        return {};
      }

      return resolveBlockPlaceholders({
        content: normalizedContent,
        context,
        enabled: placeholderCaps.enabled,
        withContext: placeholderCaps.withContext,
      });
    },
  });

  runtime.media = await runStage({
    stage: "media",
    blockType,
    blockId: block.id,
    errors: runtimeErrors,
    fallback: {},
    task: async () => {
      const mediaCaps = definition.capabilities.media;
      if (!mediaCaps?.length) {
        return {};
      }

      return resolveBlockMedia(normalizedContent, mediaCaps);
    },
  });

  runtime.business = await runStage({
    stage: "business",
    blockType,
    blockId: block.id,
    errors: runtimeErrors,
    fallback: {},
    task: async () => {
      if (definition.fetchBusiness) {
        return definition.fetchBusiness({
          block: {
            ...block,
            content: normalizedContent,
          },
          content: normalizedContent,
          context,
          mode,
        });
      }

      const fetchBusiness = await loadBlockBusinessFetcher(blockType);
      if (!fetchBusiness) {
        return {};
      }

      return fetchBusiness({
        ...block,
        content: normalizedContent,
        data: context,
      });
    },
  });

  if (runtimeErrors.length > 0) {
    runtime.meta.status = "error";
    runtime.meta.errors = runtimeErrors;
  }

  return {
    id: block.id,
    block: blockType,
    description: block.description,
    content: normalizedContent,
    runtime,
  };
}

export async function resolveBlocksV2(
  blocks: RuntimeBlockInput[],
  pageContext?: Record<string, unknown>,
  mode: BlockMode = "page",
): Promise<ResolvedBlock[]> {
  if (!blocks.length) {
    return [];
  }

  return Promise.all(
    blocks.map((block) => resolveSingleBlockV2(block, pageContext, mode)),
  );
}
