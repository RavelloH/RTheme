import { createBlockDefinition } from "@/blocks/core/definition";

export const galleryBlockDefinition = createBlockDefinition({
  type: "gallery",
  version: 2,
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.GALLERY_BLOCK_FORM_CONFIG,
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
    media: [{ path: "images", kind: "imageArray", output: "images" }],
  },
});
