import type { BaseBlockConfig } from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export type ProjectsListSortMode =
  | "publishedAt_desc"
  | "publishedAt_asc"
  | "updatedAt_desc"
  | "createdAt_desc"
  | "sortOrder_asc"
  | "stars_desc"
  | "forks_desc";

export interface ProjectsListBlockContent {
  projects?: {
    sort?: ProjectsListSortMode;
    limit?: number;
    showFeatured?: boolean;
  };
  [key: string]: unknown;
}

export interface ProjectsListItem {
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

export interface ProjectsListData {
  displayProjects: ProjectsListItem[];
  totalProjects: number;
  [key: string]: unknown;
}

export interface ProjectsListBlockConfig extends BaseBlockConfig {
  block: "projects-list";
  content: ProjectsListBlockContent;
}
