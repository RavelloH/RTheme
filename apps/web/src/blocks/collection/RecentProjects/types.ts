import type {
  BaseBlockConfig,
  BlockContentFooter,
  BlockContentHeader,
} from "@/blocks/core/types/base";
import type { ProcessedImageData } from "@/lib/shared/image-common";

export type ProjectsSortMode =
  | "publishedAt_desc"
  | "publishedAt_asc"
  | "updatedAt_desc"
  | "createdAt_desc"
  | "sortOrder_asc"
  | "stars_desc"
  | "forks_desc";

export interface ProjectsBlockContent {
  title?: {
    line1?: string;
    line2?: string;
  };
  projects?: {
    sort?: ProjectsSortMode;
    onlyWithCover?: boolean;
    showFeatured?: boolean;
  };
  worksDescription?: {
    header?: BlockContentHeader;
    content?: string;
  };
  worksSummary?: {
    content?: string[] | string;
    footer?: BlockContentFooter;
  };
  [key: string]: unknown;
}

export interface ProjectDisplayItem {
  id: number;
  title: string;
  slug: string;
  description: string;
  images: ProcessedImageData[];
  isFeatured: boolean;
  publishedAt: string | Date | null;
}

export interface ProjectsData {
  displayProjects: ProjectDisplayItem[];
  projects: number;
  filteredProjects: number;
  [key: string]: unknown;
}

export interface ProjectsBlockConfig extends BaseBlockConfig {
  block: "projects";
  content: ProjectsBlockContent;
}
