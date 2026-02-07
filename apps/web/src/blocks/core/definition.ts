import { type ComponentType, createElement } from "react";

import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import type { BlockFormConfig } from "@/blocks/core/types/field-config";

export type BlockType = string;

export type BlockMode = "page" | "editor";

export interface BlockRuntimeContext {
  slug?: string;
  page?: number;
  url?: string;
  pageSize?: number;
  [key: string]: unknown;
}

export interface BlockRuntimeErrorItem {
  code: string;
  message: string;
  stage?: string;
}

export interface BlockRuntimeEnvelope<TBusiness = unknown> {
  context: BlockRuntimeContext;
  placeholders: Record<string, unknown>;
  media: Record<string, unknown>;
  business: TBusiness;
  meta: {
    status: "ok" | "error";
    errors?: BlockRuntimeErrorItem[];
  };
}

export interface RuntimeBlockInput<TContent = unknown> {
  id: number | string;
  block: string;
  description?: string;
  content: TContent;
  data?: unknown;
}

export interface ResolvedBlock<TContent = unknown, TBusiness = unknown> {
  id: number | string;
  block: string;
  description?: string;
  content: TContent;
  runtime: BlockRuntimeEnvelope<TBusiness>;
}

export interface BlockComponentProps<TContent = unknown, TBusiness = unknown> {
  block: ResolvedBlock<TContent, TBusiness>;
  mode: BlockMode;
}

export interface BlockExecutionContext<TContent = unknown> {
  block: RuntimeBlockInput<TContent>;
  content: TContent;
  context: BlockRuntimeContext;
  mode: BlockMode;
}

export interface BlockMediaCapability {
  path: string;
  kind: "image" | "imageArray";
  output?: string;
}

export interface BlockDefinition<TContent = unknown, TBusiness = unknown> {
  type: BlockType;
  version: 2;
  schema: () => Promise<BlockFormConfig>;
  component: () => Promise<
    ComponentType<BlockComponentProps<TContent, TBusiness>>
  >;
  capabilities: {
    context: "inherit" | "none";
    placeholders?: {
      enabled: boolean;
      source: "content";
      withContext: boolean;
    };
    media?: BlockMediaCapability[];
  };
  normalizeContent?: (content: unknown) => TContent;
  fetchBusiness?: (ctx: BlockExecutionContext<TContent>) => Promise<TBusiness>;
}

export function createBlockDefinition<TContent = unknown, TBusiness = unknown>(
  definition: BlockDefinition<TContent, TBusiness>,
): BlockDefinition<TContent, TBusiness> {
  return definition;
}

export function createLegacyComponentLoader<TConfig extends { data?: unknown }>(
  loader: () => Promise<{ default: ComponentType<{ config: TConfig }> }>,
): () => Promise<ComponentType<BlockComponentProps>> {
  return async () => {
    const componentModule = await loader();
    const LegacyComponent = componentModule.default;

    return function LegacyBlockAdapter({ block }: BlockComponentProps) {
      const runtimeData = getBlockRuntimeData(block.runtime);
      const legacyConfig = {
        ...block,
        data: runtimeData,
      } as unknown as TConfig;

      return createElement(LegacyComponent, { config: legacyConfig });
    };
  };
}
