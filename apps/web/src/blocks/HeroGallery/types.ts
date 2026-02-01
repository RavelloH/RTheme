import type { BaseBlockConfig } from "@/blocks/types/base";

export interface HeroBlockContent {
  [key: string]: unknown;
}

export interface HeroBlockConfig extends BaseBlockConfig {
  block: "hero";
  content: HeroBlockContent;
}
