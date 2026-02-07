import { createBlockDefinition } from "@/blocks/core/definition";

export const tagsCategoriesBlockDefinition = createBlockDefinition({
  type: "tags-categories",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.TAGS_CATEGORIES_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
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
