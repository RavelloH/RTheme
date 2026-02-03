import prisma from "@/lib/server/prisma";

/**
 * 页面信息插值器（参数化）
 * 支持的参数：
 * - page: 页面类型
 *   - "category-index": 分类索引页
 *   - "category-detail": 分类详情页
 *   - "tag-index": 标签索引页
 *   - "tag-detail": 标签详情页
 *   - "posts-index": 文章索引页
 *   - "normal": 常规页面
 * - slug: 分类或标签的 slug（用于详情页）
 *
 * @param params - 参数对象
 * @returns 包含页面信息的对象
 */
export async function pageInfoInterpolator(
  params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const pageType = params?.page || "normal";

  // 根据页面类型返回不同的信息
  switch (pageType) {
    case "category-index":
      return {
        pageInfo: "分类列表",
      };

    case "category-detail": {
      const slug = params?.slug || "";
      const pathSlugs = slug.split("/").filter(Boolean);

      // 查找分类
      const category =
        pathSlugs.length > 0
          ? await prisma.category.findFirst({
              where: {
                path: {
                  startsWith: "/" + pathSlugs.join("/"),
                },
              },
              select: { name: true },
            })
          : null;

      return {
        pageInfo: category ? `分类：${category.name}` : "分类列表",
      };
    }

    case "tag-index":
      return {
        pageInfo: "标签列表",
      };

    case "tag-detail": {
      const slug = params?.slug || "";

      // 查找标签
      const tag = await prisma.tag.findUnique({
        where: { slug },
        select: { name: true },
      });

      return {
        pageInfo: tag ? `标签：${tag.name}` : "标签列表",
      };
    }

    case "posts-index":
      return {
        pageInfo: "文章列表",
      };

    default:
      return {
        pageInfo: "",
      };
  }
}
