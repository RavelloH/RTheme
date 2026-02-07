import { createBlockDefinition } from "@/blocks/core/definition";

export const accordionBlockDefinition = createBlockDefinition({
  type: "accordion",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.ACCORDION_BLOCK_FORM_CONFIG,
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
