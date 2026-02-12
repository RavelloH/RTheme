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
    tags: ({ content }) => {
      const normalizedContent =
        content && typeof content === "object"
          ? (content as Record<string, unknown>)
          : {};
      const filterBy =
        typeof normalizedContent.filterBy === "string"
          ? normalizedContent.filterBy
          : "all";

      if (filterBy === "tag") {
        return ["tags", "posts"];
      }
      if (filterBy === "category") {
        return ["categories", "posts"];
      }

      return ["posts"];
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
