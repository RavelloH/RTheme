import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const authorBlockDefinition = createBlockDefinition({
  type: "author",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.AUTHOR_BLOCK_FORM_CONFIG,
    ),
  component: createLegacyComponentLoader(() => import("./index")),
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
