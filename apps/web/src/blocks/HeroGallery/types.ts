import type { BaseBlockConfig } from "../types/base";

export interface HeroBlockContent {
  [key: string]: unknown;
}

export interface HeroBlockConfig extends BaseBlockConfig {
  block: "hero";
  content: HeroBlockContent;
}
