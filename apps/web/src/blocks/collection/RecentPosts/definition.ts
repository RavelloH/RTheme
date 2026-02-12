import { createBlockDefinition } from "@/blocks/core/definition";

export const postsBlockDefinition = createBlockDefinition({
  type: "posts",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.POSTS_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ["posts", "categories", "tags", "photos"],
  },
  capabilities: {
    context: "inherit",
    placeholders: {
      enabled: true,
      source: "content",
      withContext: true,
    },
    media: [],
  },
});
