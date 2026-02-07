import type { ComponentType } from "react";

import { accordionBlockDefinition } from "@/blocks/collection/Accordion/definition";
import { archiveCalendarBlockDefinition } from "@/blocks/collection/ArchiveCalendar/definition";
import { authorBlockDefinition } from "@/blocks/collection/Author/definition";
import { ctaBlockDefinition } from "@/blocks/collection/CallToAction/definition";
import { cardsBlockDefinition } from "@/blocks/collection/Cards/definition";
import { defaultBlockDefinition } from "@/blocks/collection/Default/definition";
import { dividerBlockDefinition } from "@/blocks/collection/Divider/definition";
import { galleryBlockDefinition } from "@/blocks/collection/Gallery/definition";
import { heroBlockDefinition } from "@/blocks/collection/HeroGallery/definition";
import { multiRowLayoutBlockDefinition } from "@/blocks/collection/MultiRowLayout/definition";
import { pagedPostsBlockDefinition } from "@/blocks/collection/PagedPosts/definition";
import { paginationBlockDefinition } from "@/blocks/collection/Pagination/definition";
import { quoteBlockDefinition } from "@/blocks/collection/Quote/definition";
import { postsBlockDefinition } from "@/blocks/collection/RecentPosts/definition";
import { projectsBlockDefinition } from "@/blocks/collection/RecentProjects/definition";
import { socialLinksBlockDefinition } from "@/blocks/collection/SocialLinks/definition";
import { tabsBlockDefinition } from "@/blocks/collection/Tabs/definition";
import { tagsCategoriesBlockDefinition } from "@/blocks/collection/TagsCategories/definition";
import { testimonialBlockDefinition } from "@/blocks/collection/Testimonials/definition";
import { timelineItemBlockDefinition } from "@/blocks/collection/Timeline/definition";
import type {
  BlockComponentProps,
  BlockDefinition,
  BlockType,
} from "@/blocks/core/definition";
import type { BlockFormConfig } from "@/blocks/core/types/field-config";

const BLOCK_DEFINITIONS = [
  defaultBlockDefinition,
  heroBlockDefinition,
  projectsBlockDefinition,
  postsBlockDefinition,
  tagsCategoriesBlockDefinition,
  accordionBlockDefinition,
  pagedPostsBlockDefinition,
  paginationBlockDefinition,
  quoteBlockDefinition,
  dividerBlockDefinition,
  cardsBlockDefinition,
  ctaBlockDefinition,
  authorBlockDefinition,
  socialLinksBlockDefinition,
  testimonialBlockDefinition,
  tabsBlockDefinition,
  galleryBlockDefinition,
  multiRowLayoutBlockDefinition,
  timelineItemBlockDefinition,
  archiveCalendarBlockDefinition,
] as const;

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

export function getAllBlockDefinitions(): BlockDefinition[] {
  return Array.from(blockCatalog.values());
}
