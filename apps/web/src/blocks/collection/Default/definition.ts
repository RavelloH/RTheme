import { createBlockDefinition } from "@/blocks/core/definition";

export const defaultBlockDefinition = createBlockDefinition({
  type: "default",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.DEFAULT_BLOCK_FORM_CONFIG,
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
