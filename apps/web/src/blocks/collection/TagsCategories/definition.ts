import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const tagsCategoriesBlockDefinition = createBlockDefinition({
  type: "tags-categories",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.TAGS_CATEGORIES_BLOCK_FORM_CONFIG,
    ),
  component: createLegacyComponentLoader(() => import("./index")),
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
