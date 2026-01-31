import type {
  BaseBlockConfig,
  BlockContentHeader,
  BlockContentTitle,
  BlockContentBody,
  BlockContentFooter,
} from "../types/base";

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
