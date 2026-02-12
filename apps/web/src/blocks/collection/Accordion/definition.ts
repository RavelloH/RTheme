import { createBlockDefinition } from "@/blocks/core/definition";

export const accordionBlockDefinition = createBlockDefinition({
  type: "accordion",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.ACCORDION_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ({ content, context }) => {
      const normalizedContent =
        content && typeof content === "object"
          ? (content as Record<string, unknown>)
          : {};
      const source =
        typeof normalizedContent.source === "string"
          ? normalizedContent.source
          : "tags";
      const scopedSlug =
        typeof context.slug === "string"
          ? context.slug
              .trim()
              .split("/")
              .map((segment) => segment.trim())
              .filter(Boolean)
              .join("/")
          : "";

      switch (source) {
        case "tags":
          return ["tags/list", "posts/list", "projects/list"];
        case "categories":
          return ["categories/list", "posts/list", "projects/list"];
        case "child-categories":
          return scopedSlug
            ? ["categories/list", `categories/${scopedSlug}`]
            : ["categories/list"];
        case "posts":
          return ["posts/list"];
        default:
          return [
            "tags/list",
            "categories/list",
            "posts/list",
            "projects/list",
          ];
      }
    },
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
