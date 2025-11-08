declare module "markdown-it-mark" {
  import type MarkdownIt from "markdown-it";
  const markdownItMark: MarkdownIt.PluginSimple;
  export default markdownItMark;
}

declare module "markdown-it-sub" {
  import type MarkdownIt from "markdown-it";
  const markdownItSub: MarkdownIt.PluginSimple;
  export default markdownItSub;
}

declare module "markdown-it-sup" {
  import type MarkdownIt from "markdown-it";
  const markdownItSup: MarkdownIt.PluginSimple;
  export default markdownItSup;
}
