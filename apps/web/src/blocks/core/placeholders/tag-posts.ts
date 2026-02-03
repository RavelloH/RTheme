import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理 {tagPosts|slug=xxx&page=1} 占位符
 * 返回单个标签的详细信息和分页数据
 *
 * @param params - 参数对象
 *   - slug: 标签 slug
 *   - page: 页码（默认 1）
 * @returns 包含标签信息和分页数据的对象
 */
export async function tagPostsInterpolator(
  params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const slug = params?.slug || "";
  const page = parseInt(params?.page || "1", 10);
  const pageSize = 20;

  // 并发获取标签信息和文章总数
  const [tag, totalPosts] = await Promise.all([
    // 获取标签信息
    prisma.tag.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        description: true,
        updatedAt: true,
        createdAt: true,
      },
    }),
    // 统计该标签下的已发布文章数
    prisma.post.count({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        tags: {
          some: { slug },
        },
      },
    }),
  ]);

  if (!tag) {
    // 标签不存在，返回默认值
    return {
      tag: "",
      tagName: "",
      tagDescription: "",
      posts: 0,
      pageInfo: "",
      lastUpdatedDate: new Date().toISOString(),
      lastUpdatedDays: new Date().toISOString(),
      page: 1,
      totalPage: 1,
      firstPage: 0,
      lastPage: 0,
    };
  }

  const totalPages = Math.ceil(totalPosts / pageSize);
  const firstPost = pageSize * (page - 1) + 1;
  const lastPost = Math.min(pageSize * page, totalPosts);

  return {
    tag: tag.name,
    tagName: tag.name,
    tagDescription: tag.description || "",
    posts: totalPosts,
    pageInfo: `标签：${tag.name}`,
    lastUpdatedDate: tag.updatedAt.toISOString(), // ISO 字符串，供客户端组件转换为相对时间
    lastUpdatedDays: tag.updatedAt.toISOString(), // 用于 ProcessedText 的相对时间显示
    page,
    totalPage: totalPages,
    firstPage: firstPost,
    lastPage: lastPost,
  };
}
