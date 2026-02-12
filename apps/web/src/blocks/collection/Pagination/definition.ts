import { createBlockDefinition } from "@/blocks/core/definition";

export const paginationBlockDefinition = createBlockDefinition({
  type: "pagination",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PAGINATION_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ({ content, context }) => {
      const normalizedContent =
        content && typeof content === "object"
          ? (content as Record<string, unknown>)
          : {};
      const filterBy =
        typeof normalizedContent.filterBy === "string"
          ? normalizedContent.filterBy
          : "all";
      const scopedSlug =
        typeof context.slug === "string"
          ? context.slug
              .trim()
              .split("/")
              .map((segment) => segment.trim())
              .filter(Boolean)
              .join("/")
          : "";

      if (filterBy === "tag") {
        return scopedSlug
          ? ["posts/list", "tags/list", `tags/${scopedSlug}`]
          : ["posts/list", "tags/list"];
      }
      if (filterBy === "category") {
        return scopedSlug
          ? ["posts/list", "categories/list", `categories/${scopedSlug}`]
          : ["posts/list", "categories/list"];
      }

      return ["posts/list", "tags/list", "categories/list"];
    },
  },
  capabilities: {
    context: "inherit",
    placeholders: {
      enabled: false,
      source: "content",
      withContext: true,
    },
    media: [],
  },
});
