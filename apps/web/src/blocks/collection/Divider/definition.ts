import { createBlockDefinition } from "@/blocks/core/definition";

export const dividerBlockDefinition = createBlockDefinition({
  type: "divider",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.DIVIDER_BLOCK_FORM_CONFIG,
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
