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
      return ["posts/list"];
    case "categories":
      return ["categories/list"];
    case "tags":
      return ["tags/list"];
    case "projects":
      return ["projects/list"];
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
    tags: ({ content, context }) => {
      const tags = new Set<string>();
      const normalizedContent =
        content && typeof content === "object"
          ? (content as Record<string, unknown>)
          : {};
      const scopedSlug =
        typeof context.slug === "string"
          ? context.slug
              .trim()
              .split("/")
              .map((segment) => segment.trim())
              .filter(Boolean)
              .join("/")
          : "";

      const dataSource = normalizeString(normalizedContent.dataSource);
      switch (dataSource) {
        case "posts-index":
          tags.add("posts/list");
          break;
        case "categories-index":
          tags.add("categories/list");
          break;
        case "category-detail":
          tags.add("categories/list");
          if (scopedSlug) {
            tags.add(`categories/${scopedSlug}`);
          }
          break;
        case "tags-index":
          tags.add("tags/list");
          break;
        case "tag-detail":
          tags.add("tags/list");
          if (scopedSlug) {
            tags.add(`tags/${scopedSlug}`);
          }
          break;
        case "projects-index":
          tags.add("projects/list");
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
