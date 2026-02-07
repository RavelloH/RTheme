import { createBlockDefinition } from "@/blocks/core/definition";

export const cardsBlockDefinition = createBlockDefinition({
  type: "cards",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.CARDS_BLOCK_FORM_CONFIG,
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
    media: [{ path: "image", kind: "image", output: "image" }],
  },
});
