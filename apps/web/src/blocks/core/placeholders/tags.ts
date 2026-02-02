import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理 {tags} 占位符
 * 返回标签总数、最后更新时间、页面信息和标签列表（用于随机链接）
 */
export async function tagsInterpolator(): Promise<Record<string, unknown>> {
  // 并发获取所有统计数据
  const [totalTags, lastPost, allTags] = await Promise.all([
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
    // 获取最后一篇更新文章的更新时间
    prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        updatedAt: true,
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

  const lastUpdateDate = lastPost?.updatedAt || new Date();
  const tagsList = allTags.map((t) => `/tags/${t.slug}`);

  return {
    tags: totalTags,
    lastUpdatedDate: lastUpdateDate.toISOString(), // ISO 字符串，供客户端组件转换为相对时间
    pageInfo: "标签列表",
    tagsList, // 用于随机链接
  };
}
