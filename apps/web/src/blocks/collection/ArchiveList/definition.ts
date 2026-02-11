import { createBlockDefinition } from "@/blocks/core/definition";

export const archiveListBlockDefinition = createBlockDefinition({
  type: "archive-list",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.ARCHIVE_LIST_BLOCK_FORM_CONFIG,
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
