import type { BaseBlockConfig } from "@/blocks/core/types/base";

export interface HeroBlockContent {
  [key: string]: unknown;
}

export interface HeroBlockConfig extends BaseBlockConfig {
  block: "hero";
  content: HeroBlockContent;
}
