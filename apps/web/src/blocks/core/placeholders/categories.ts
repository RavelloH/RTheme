import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理 {categories}, {rootCategories}, {childCategories}, {lastUpdatedDays}, {pageInfo}, {categoriesList}
 * 返回分类统计数据和链接列表（用于随机跳转）
 */
export async function categoriesInterpolator(
  _params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  // 并发获取所有统计数据
  const [totalCount, rootCategories, lastUpdated, allCategories] =
    await Promise.all([
      // 统计总分类数
      prisma.category.count(),
      // 统计根分类数
      prisma.category.count({ where: { parentId: null } }),
      // 获取最后更新时间
      prisma.category.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      }),
      // 获取所有根分类的 slug（用于随机链接）
      prisma.category.findMany({
        where: { parentId: null },
        select: { slug: true },
        orderBy: { order: "asc" },
      }),
    ]);

  const childCategories = totalCount - rootCategories;
  const lastUpdateDate = lastUpdated?.updatedAt || new Date();
  const categoriesList = allCategories.map((c) => `/categories/${c.slug}`);

  return {
    categories: totalCount,
    rootCategories,
    childCategories,
    lastUpdatedDate: lastUpdateDate.toISOString(), // ISO 字符串，供客户端组件转换为相对时间
    lastUpdatedDays: lastUpdateDate.toISOString(), // 用于 ProcessedText 的相对时间显示
    pageInfo: "分类列表",
    categoriesList, // 用于随机链接
  };
}
