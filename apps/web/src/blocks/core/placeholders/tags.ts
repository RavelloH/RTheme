import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理 {tags} 占位符
 * 返回标签总数和标签列表（用于随机跳转）
 */
export async function tagsInterpolator(
  _params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  // 并发获取所有统计数据
  const [totalTags, allTags] = await Promise.all([
    // 统计有文章的标签数
    prisma.tag.count({
      where: {
        posts: {
          some: {
            deletedAt: null,
          },
        },
      },
    }),
    // 获取所有标签的 slug（用于随机链接）
    prisma.tag.findMany({
      where: {
        posts: {
          some: {
            deletedAt: null,
          },
        },
      },
      select: {
        slug: true,
      },
    }),
  ]);

  const tagsList = allTags.map((t) => `/tags/${t.slug}`);

  return {
    tags: totalTags,
    tagsList, // 用于随机链接
  };
}
