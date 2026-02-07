import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const ctaBlockDefinition = createBlockDefinition({
  type: "cta",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.CTA_BLOCK_FORM_CONFIG,
    ),
  component: createLegacyComponentLoader(() => import("./index")),
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
