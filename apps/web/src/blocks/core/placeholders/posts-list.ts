import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理文章列表页面的占位符
 * 返回文章总数、分页数据和时间范围信息
 *
 * @param params - 参数对象
 *   - page: 页码（默认 1）
 *   - pageSize: 每页数量（默认 20）
 * @returns 包含文章列表页数据的对象
 */
export async function postsListInterpolator(
  params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const page = parseInt(params?.page || "1", 10);
  const pageSize = parseInt(params?.pageSize || "20", 10);

  // 并发获取统计数据
  const [totalPosts, firstPost, _lastPost] = await Promise.all([
    // 统计已发布文章数
    prisma.post.count({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
    }),
    // 获取第一篇发布的文章
    prisma.post.findFirst({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      orderBy: {
        publishedAt: "asc",
      },
      select: {
        publishedAt: true,
      },
    }),
    // 获取最后一篇更新的文章（已被 lastPublishDays 全局插值器替代）
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
  ]);

  // 获取所有文章的 slug（用于随机链接）
  const allPosts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    select: {
      slug: true,
    },
  });

  const postsList = allPosts.map((p) => `/posts/${p.slug}`);

  const totalPages = Math.ceil(totalPosts / pageSize);
  const firstPostNum = pageSize * (page - 1) + 1;
  const lastPostNum = Math.min(pageSize * page, totalPosts);

  // 格式化日期
  // firstPublishAt: 本地日期格式，如 "2025年 11 月 4 日"
  const firstPublishAtFormatted = firstPost?.publishedAt
    ? new Date(firstPost.publishedAt)
        .toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        .replace(/年/, " 年 ")
        .replace(/月/, " 月 ")
        .replace(/日/, " 日")
    : "未知日期";

  return {
    postsList, // 用于随机链接
    postsListPage: page,
    postsListTotalPage: totalPages,
    postsListFirstPage: firstPostNum,
    postsListLastPage: lastPostNum,
    firstPublishAt: firstPublishAtFormatted,
  };
}
