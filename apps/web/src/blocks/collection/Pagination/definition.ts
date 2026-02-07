import { createBlockDefinition } from "@/blocks/core/definition";

export const paginationBlockDefinition = createBlockDefinition({
  type: "pagination",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PAGINATION_BLOCK_FORM_CONFIG,
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
