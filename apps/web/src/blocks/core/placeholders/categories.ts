import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理 {categories}, {rootCategories}, {childCategories}, {categoriesList}
 * 返回分类统计数据和链接列表（用于随机跳转）
 */
export async function categoriesInterpolator(
  _params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  // 并发获取所有统计数据
  const [totalCount, rootCategories, allCategories] = await Promise.all([
    // 统计总分类数
    prisma.category.count(),
    // 统计根分类数
    prisma.category.count({ where: { parentId: null } }),
    // 获取所有根分类的 slug（用于随机链接）
    prisma.category.findMany({
      where: { parentId: null },
      select: { slug: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const childCategories = totalCount - rootCategories;
  const categoriesList = allCategories.map((c) => `/categories/${c.slug}`);

  return {
    categories: totalCount,
    rootCategories,
    childCategories,
    categoriesList, // 用于随机链接
  };
}
