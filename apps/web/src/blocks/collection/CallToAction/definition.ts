import { createBlockDefinition } from "@/blocks/core/definition";

export const ctaBlockDefinition = createBlockDefinition({
  type: "cta",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.CTA_BLOCK_FORM_CONFIG,
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
    media: [
      { path: "backgroundImage", kind: "image", output: "backgroundImage" },
    ],
  },
});
