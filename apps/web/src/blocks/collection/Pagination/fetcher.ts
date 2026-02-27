import type { PaginationData } from "@/blocks/collection/Pagination/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import { interpolatorMap } from "@/blocks/core/placeholders";

type Interpolator = (
  params?: Record<string, string>,
) => Promise<Record<string, unknown>>;

function toPositiveNumber(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function resolveTotalPagesFromInterpolator(params: {
  interpolatorKey: "postsList" | "tagPosts" | "categoryPosts";
  resultKey: "postsListTotalPage" | "tagTotalPage" | "categoryTotalPage";
  page: number;
  pageSize: number;
  slug?: string;
}): Promise<number | null> {
  try {
    const interpolatorLoader = interpolatorMap[params.interpolatorKey];
    if (!interpolatorLoader) return null;

    const interpolatorModule = await interpolatorLoader();
    const interpolator = Object.values(interpolatorModule)[0] as
      | Interpolator
      | undefined;

    if (typeof interpolator !== "function") return null;

    const result = await interpolator({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.slug ? { slug: params.slug } : {}),
    });

    return toPositiveNumber(result[params.resultKey]);
  } catch (error) {
    console.error(
      `[PaginationBlock Fetcher] Failed to resolve total pages via ${params.interpolatorKey}:`,
      error,
    );
    return null;
  }
}

/**
 * PaginationBlock Fetcher
 * 从 config.data 中获取分页信息并计算 basePath
 * 统一通过插值器回填 totalPages，避免依赖未注入的上下文字段
 */
export const paginationFetcher = async function (
  config: RuntimeBlockInput,
): Promise<PaginationData> {
  const data = (config.data || {}) as Record<string, unknown>;
  const content = config.content as
    | { filterBy?: "all" | "tag" | "category" }
    | undefined;

  // 计算 basePath
  const filterBy = content?.filterBy || "all";
  const slug = (data.slug as string) || "";
  const currentPage = toPositiveNumber(data.page) || 1;
  const pageSize = toPositiveNumber(data.pageSize) || 20;

  let basePath: string;
  if (filterBy === "all") {
    basePath = "/posts";
  } else {
    basePath = `/${filterBy === "tag" ? "tags" : "categories"}/${slug}`;
  }

  // 优先使用上下文中已存在的页数字段，其次回退到插值器计算
  let totalPages = 1;
  if (filterBy === "all" && !toPositiveNumber(data.postsListTotalPage)) {
    try {
      totalPages =
        (await resolveTotalPagesFromInterpolator({
          interpolatorKey: "postsList",
          resultKey: "postsListTotalPage",
          page: currentPage,
          pageSize,
        })) || 1;
    } catch (error) {
      console.error(
        "[PaginationBlock Fetcher] Failed to resolve totalPages for posts list:",
        error,
      );
    }
  } else if (filterBy === "all") {
    totalPages = toPositiveNumber(data.postsListTotalPage) || 1;
  } else if (filterBy === "tag") {
    totalPages =
      toPositiveNumber(data.tagTotalPage) ||
      toPositiveNumber(data.totalPage) ||
      (await resolveTotalPagesFromInterpolator({
        interpolatorKey: "tagPosts",
        resultKey: "tagTotalPage",
        page: currentPage,
        pageSize,
        slug,
      })) ||
      1;
  } else {
    totalPages =
      toPositiveNumber(data.categoryTotalPage) ||
      toPositiveNumber(data.totalPage) ||
      (await resolveTotalPagesFromInterpolator({
        interpolatorKey: "categoryPosts",
        resultKey: "categoryTotalPage",
        page: currentPage,
        pageSize,
        slug,
      })) ||
      1;
  }

  if (totalPages < 1) {
    totalPages = 1;
  }

  return {
    currentPage,
    totalPages,
    basePath,
  };
};
