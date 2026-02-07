import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const timelineItemBlockDefinition = createBlockDefinition({
  type: "timeline-item",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.TIMELINE_ITEM_BLOCK_FORM_CONFIG,
    ),
  component: createLegacyComponentLoader(() => import("./index")),
  capabilities: {
    context: "inherit",
    placeholders: {
      enabled: true,
      source: "content",
      withContext: true,
    },
    media: [{ path: "image", kind: "image", output: "imageData" }],
  },
});
