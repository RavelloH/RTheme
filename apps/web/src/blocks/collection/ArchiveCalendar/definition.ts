import { createBlockDefinition } from "@/blocks/core/definition";

export const archiveCalendarBlockDefinition = createBlockDefinition({
  type: "archive-calendar",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.ARCHIVE_CALENDAR_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ["posts"],
  },
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
