import {
  countCategoryPosts,
  countDirectChildren,
  findCategoryByPath,
} from "@/lib/server/category-utils";

/**
 * 插值器：处理分类详情页占位符
 * 返回单个分类的详细信息和分页数据
 *
 * @param params - 参数对象
 *   - slug: 分类 slug 路径（例如 "tech/web" 或 "tech"）
 *   - page: 页码（默认 1）
 * @returns 包含分类信息和分页数据的对象
 */
export async function categoryPostsInterpolator(
  params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const slugPath = params?.slug || "";
  const page = parseInt(params?.page || "1", 10);
  const pageSize = 20;

  // 解析 slug 路径为数组
  const pathSlugs = slugPath.split("/").filter(Boolean);

  // 根据路径查找分类
  const category =
    pathSlugs.length > 0 ? await findCategoryByPath(pathSlugs) : null;

  if (!category) {
    // 分类不存在，返回默认值
    return {
      category: "",
      categoryName: "",
      categoryDescription: "",
      categories: 0,
      posts: 0,
      page: 1,
      totalPage: 1,
      firstPage: 0,
      lastPage: 0,
    };
  }

  // 并发获取子分类数和文章总数
  const [childCategoryCount, totalPosts] = await Promise.all([
    // 统计直接子分类数
    countDirectChildren(category.id),
    // 统计该分类及所有子孙分类下的已发布文章数
    countCategoryPosts(category.id),
  ]);

  const totalPages = Math.ceil(totalPosts / pageSize);
  const firstPost = pageSize * (page - 1) + 1;
  const lastPost = Math.min(pageSize * page, totalPosts);

  return {
    category: category.name,
    categoryName: category.name,
    categoryDescription: category.description || "",
    categorySubcategoryCount: childCategoryCount,
    categoryPostCount: totalPosts,
    categoryPage: page,
    categoryTotalPage: totalPages,
    categoryFirstPage: firstPost,
    categoryLastPage: lastPost,
  };
}
