import { createBlockDefinition } from "@/blocks/core/definition";

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function inferRandomSourceFromDataSource(
  dataSource: string | undefined,
): string | undefined {
  switch (dataSource) {
    case "posts-index":
      return "posts";
    case "categories-index":
    case "category-detail":
      return "categories";
    case "tags-index":
    case "tag-detail":
      return "tags";
    case "projects-index":
      return "projects";
    default:
      return undefined;
  }
}

function getRandomSourceTags(source: string | undefined): readonly string[] {
  switch (source) {
    case "posts":
      return ["posts"];
    case "categories":
      return ["categories", "posts"];
    case "tags":
      return ["tags", "posts"];
    case "projects":
      return ["projects"];
    default:
      return [];
  }
}

export const defaultBlockDefinition = createBlockDefinition({
  type: "default",
  schema: () =>
    import("./schema").then(
      (schemaModule) => schemaModule.DEFAULT_BLOCK_FORM_CONFIG,
    ),
  component: () =>
    import("./index").then((componentModule) => componentModule.default),
  cache: {
    tags: ({ content }) => {
      const tags = new Set<string>();
      const normalizedContent =
        content && typeof content === "object"
          ? (content as Record<string, unknown>)
          : {};

      const dataSource = normalizeString(normalizedContent.dataSource);
      switch (dataSource) {
        case "posts-index":
          tags.add("posts");
          break;
        case "categories-index":
        case "category-detail":
          tags.add("categories");
          tags.add("posts");
          break;
        case "tags-index":
        case "tag-detail":
          tags.add("tags");
          tags.add("posts");
          break;
        case "projects-index":
          tags.add("projects");
          break;
        default:
          break;
      }

      const footer =
        normalizedContent.footer && typeof normalizedContent.footer === "object"
          ? (normalizedContent.footer as Record<string, unknown>)
          : undefined;
      const footerType = normalizeString(footer?.type);
      const randomSource =
        normalizeString(footer?.randomSource) ||
        inferRandomSourceFromDataSource(dataSource);
      if (footerType === "random") {
        for (const tag of getRandomSourceTags(randomSource)) {
          tags.add(tag);
        }
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
    media: [],
  },
});
