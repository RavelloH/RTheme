import {
  createBlockDefinition,
  createLegacyComponentLoader,
} from "@/blocks/core/definition";

export const galleryBlockDefinition = createBlockDefinition({
  type: "gallery",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.GALLERY_BLOCK_FORM_CONFIG,
    ),
  component: createLegacyComponentLoader(() => import("./index")),
  capabilities: {
    context: "inherit",
    placeholders: {
      enabled: true,
      source: "content",
      withContext: true,
    },
    media: [{ path: "images", kind: "imageArray", output: "images" }],
  },
});
