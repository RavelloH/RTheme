import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export interface FeaturedProjectsBlockContent {
  projects?: {
    count?: number;
    onlyFeatured?: boolean;
  };
  [key: string]: unknown;
}

export interface FeaturedProjectItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  stars: number;
  forks: number;
  languages: string[];
  license: string | null;
  startedAt: string | Date | null;
  completedAt: string | Date | null;
  links: string[];
  images: ProcessedImageData[];
  isFeatured: boolean;
}

export interface FeaturedProjectsData {
  displayProjects: FeaturedProjectItem[];
  totalProjects: number;
  [key: string]: unknown;
}

export interface FeaturedProjectsBlockConfig extends BaseBlockConfig {
  block: "featured-projects";
  content: FeaturedProjectsBlockContent;
}
