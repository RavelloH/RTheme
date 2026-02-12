import type { ComponentType } from "react";

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

export interface BlockMediaCapability {
  path: string;
  kind: "image" | "imageArray";
  output?: string;
}

export interface BlockCacheTagResolverParams<TContent = unknown> {
  block: RuntimeBlockInput<TContent>;
  content: TContent;
  context: BlockRuntimeContext;
}

export interface BlockCacheConfig<TContent = unknown> {
  tags:
    | readonly string[]
    | ((params: BlockCacheTagResolverParams<TContent>) => readonly string[]);
}

export interface BlockDefinition<TContent = unknown, TBusiness = unknown> {
  type: BlockType;
  schema: () => Promise<BlockFormConfig>;
  component: () => Promise<
    ComponentType<BlockComponentProps<TContent, TBusiness>>
  >;
  cache?: BlockCacheConfig<TContent>;
  capabilities: {
    context: "inherit" | "none";
    placeholders?: {
      enabled: boolean;
      source: "content";
      withContext: boolean;
    };
    media?: BlockMediaCapability[];
  };
}

export function createBlockDefinition<TContent = unknown, TBusiness = unknown>(
  definition: BlockDefinition<TContent, TBusiness>,
): BlockDefinition<TContent, TBusiness> {
  return definition;
}
