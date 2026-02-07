import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const paginationBlockDefinition = createBlockDefinition({
  type: "pagination",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PAGINATION_BLOCK_FORM_CONFIG,
    ),
  component: createLegacyComponentLoader(() => import("./index")),
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
