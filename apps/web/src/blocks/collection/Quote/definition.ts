import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const quoteBlockDefinition = createBlockDefinition({
  type: "quote",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.QUOTE_BLOCK_FORM_CONFIG,
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
