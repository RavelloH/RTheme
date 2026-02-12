import { createBlockDefinition } from "@/blocks/core/definition";

export const pagedPostsBlockDefinition = createBlockDefinition({
  type: "paged-posts",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.PAGED_POSTS_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ({ content, context }) => {
      const tags = new Set<string>(["posts/list"]);
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
        tags.add("tags/list");
        if (scopedSlug) {
          tags.add(`tags/${scopedSlug}`);
        }
      } else if (filterBy === "category") {
        tags.add("categories/list");
        if (scopedSlug) {
          tags.add(`categories/${scopedSlug}`);
        }
      } else {
        tags.add("tags/list");
        tags.add("categories/list");
      }

      return Array.from(tags);
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
