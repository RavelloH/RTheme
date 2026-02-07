import { createBlockDefinition } from "@/blocks/core/definition";

export const authorBlockDefinition = createBlockDefinition({
  type: "author",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.AUTHOR_BLOCK_FORM_CONFIG,
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
    media: [{ path: "avatar", kind: "image", output: "avatar" }],
  },
});
