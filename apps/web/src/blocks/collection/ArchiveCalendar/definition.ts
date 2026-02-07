import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const archiveCalendarBlockDefinition = createBlockDefinition({
  type: "archive-calendar",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.ARCHIVE_CALENDAR_BLOCK_FORM_CONFIG,
    ),
  component: createLegacyComponentLoader(() => import("./index")),
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
