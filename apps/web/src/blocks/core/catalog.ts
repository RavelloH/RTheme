import type { ComponentType } from "react";

import type {
  BlockComponentProps,
  BlockDefinition,
  BlockType,
} from "@/blocks/core/definition";
import { BLOCK_DEFINITIONS } from "@/blocks/core/generated/block-definitions";
import type { BlockFormConfig } from "@/blocks/core/types/field-config";

const blockCatalog = new Map<BlockType, BlockDefinition>();

for (const definition of BLOCK_DEFINITIONS) {
  if (blockCatalog.has(definition.type)) {
    throw new Error(`[BlockCatalog] 重复注册的 block type: ${definition.type}`);
  }

  blockCatalog.set(definition.type, definition as BlockDefinition);
}

export function getBlockDefinition(type: string): BlockDefinition | null {
  return blockCatalog.get(type) || null;
}

export function getRegisteredBlockTypes(): string[] {
  return Array.from(blockCatalog.keys());
}

export async function getBlockSchema(
  type: string,
): Promise<BlockFormConfig | null> {
  const definition = getBlockDefinition(type);
  if (!definition) {
    return null;
  }

  return definition.schema();
}

export async function getAllBlockSchemas(): Promise<BlockFormConfig[]> {
  const definitions = Array.from(blockCatalog.values());
  const schemas = await Promise.all(
    definitions.map((definition) => definition.schema()),
  );
  return schemas;
}

export async function loadBlockComponent(
  type: string,
): Promise<ComponentType<BlockComponentProps> | null> {
  const definition = getBlockDefinition(type);
  if (!definition) {
    return null;
  }

  return definition.component() as Promise<ComponentType<BlockComponentProps>>;
}
