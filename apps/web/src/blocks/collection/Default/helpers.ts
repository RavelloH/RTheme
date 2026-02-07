export type DefaultDataSource =
  | "normal"
  | "posts-index"
  | "categories-index"
  | "category-detail"
  | "tags-index"
  | "tag-detail";

export type RandomSource = "posts" | "categories" | "tags";

export function inferRandomSource(
  dataSource: string | undefined,
): RandomSource {
  switch (dataSource as DefaultDataSource) {
    case "posts-index":
      return "posts";
    case "categories-index":
    case "category-detail":
      return "categories";
    case "tags-index":
    case "tag-detail":
      return "tags";
    case "normal":
    default:
      return "tags";
  }
}
