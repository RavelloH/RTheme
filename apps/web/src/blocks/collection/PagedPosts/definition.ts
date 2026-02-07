import { createBlockDefinition } from "@/blocks/core/definition";

export const pagedPostsBlockDefinition = createBlockDefinition({
  type: "paged-posts",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PAGED_POSTS_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
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
