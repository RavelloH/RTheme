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
    tags: ({ content }) => {
      const normalizedContent =
        content && typeof content === "object"
          ? (content as Record<string, unknown>)
          : {};
      const source =
        typeof normalizedContent.source === "string"
          ? normalizedContent.source
          : "tags";

      switch (source) {
        case "tags":
          return ["tags", "posts", "projects", "photos"];
        case "categories":
        case "child-categories":
          return ["categories", "posts", "projects", "photos"];
        case "posts":
          return ["posts", "photos"];
        default:
          return ["tags", "categories", "posts", "projects", "photos"];
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
