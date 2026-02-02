import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface HeroBlockContent {
  [key: string]: unknown;
}

export interface HeroBlockConfig extends BaseBlockConfig {
  block: "hero";
  content: HeroBlockContent;
}

export interface HeroData {
  galleryImages: ProcessedImageData[];
  siteTitle: string;
  siteSlogan: string;
  logoImage?: ProcessedImageData;
  [key: string]: unknown;
}
