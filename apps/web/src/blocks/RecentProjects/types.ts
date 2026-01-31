import type {
  BaseBlockConfig,
  BlockContentHeader,
  BlockContentFooter,
} from "../types/base";

export interface ProjectsBlockContent {
  worksDescription?: {
    header: BlockContentHeader;
    content: string; // 简化为 string
  };
  worksSummary?: {
    content: string[]; // 简化为 string[]
    footer: BlockContentFooter;
  };
  [key: string]: unknown;
}

export interface ProjectsBlockConfig extends BaseBlockConfig {
  block: "projects";
  content: ProjectsBlockContent;
}
