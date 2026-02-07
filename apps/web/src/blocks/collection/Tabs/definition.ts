import { createBlockDefinition } from "@/blocks/core/definition";

export const tabsBlockDefinition = createBlockDefinition({
  type: "tabs",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.TABS_BLOCK_FORM_CONFIG,
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
