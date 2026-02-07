import { createBlockDefinition } from "@/blocks/core/definition";

export const heroBlockDefinition = createBlockDefinition({
  type: "hero",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.HERO_BLOCK_FORM_CONFIG,
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
    media: [
      { path: "logoImage", kind: "image", output: "logoImage" },
      { path: "galleryImages", kind: "imageArray", output: "galleryImages" },
    ],
  },
});
