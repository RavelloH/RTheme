import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const dividerBlockDefinition = createBlockDefinition({
  type: "divider",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.DIVIDER_BLOCK_FORM_CONFIG,
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
