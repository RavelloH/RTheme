import { createBlockDefinition } from "@/blocks/core/definition";

export const socialLinksBlockDefinition = createBlockDefinition({
  type: "social-links",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.SOCIAL_LINKS_BLOCK_FORM_CONFIG,
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
