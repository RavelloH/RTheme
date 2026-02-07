import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const accordionBlockDefinition = createBlockDefinition({
  type: "accordion",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.ACCORDION_BLOCK_FORM_CONFIG,
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
