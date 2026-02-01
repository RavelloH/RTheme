import type {
  BaseBlockConfig,
  BlockContentBody,
  BlockContentFooter,
  BlockContentHeader,
  BlockContentTitle,
} from "@/blocks/core/types/base";

export interface DefaultBlockContent {
  header?: BlockContentHeader;
  title?: BlockContentTitle;
  content?: BlockContentBody;
  footer?: BlockContentFooter;
  [key: string]: unknown;
}

export interface DefaultBlockConfig extends BaseBlockConfig {
  block: "default";
  content: DefaultBlockContent;
}
