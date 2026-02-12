import { createBlockDefinition } from "@/blocks/core/definition";

export const heroBlockDefinition = createBlockDefinition({
  type: "hero",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.HERO_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ({ content }) => {
      const tags = new Set<string>(["config"]);
      const normalizedContent =
        content && typeof content === "object"
          ? (content as Record<string, unknown>)
          : {};

      const galleryImagesOrigin =
        typeof normalizedContent.galleryImagesOrigin === "string"
          ? normalizedContent.galleryImagesOrigin
          : undefined;

      if (!galleryImagesOrigin || galleryImagesOrigin === "latestPosts") {
        tags.add("posts");
      }
      if (galleryImagesOrigin === "latestGallery") {
        tags.add("photos");
      }

      return Array.from(tags);
    },
  },
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
