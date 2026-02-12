import { createBlockDefinition } from "@/blocks/core/definition";

export const pagedPostsBlockDefinition = createBlockDefinition({
  type: "paged-posts",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PAGED_POSTS_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ["posts", "categories", "tags", "photos"],
  },
  capabilities: {
    context: "inherit",
    placeholders: {
      enabled: false,
      source: "content",
      withContext: true,
    },
    media: [],
  },
});
