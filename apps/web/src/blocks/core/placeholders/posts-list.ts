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
  const [totalPosts, firstPost, lastPost] = await Promise.all([
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
    // 获取最后一篇更新的文章
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
        .replace(/年/, "年 ")
        .replace(/月/, " 月 ")
        .replace(/日/, " 日")
    : "未知日期";

  // lastPublishDays: 相对日期，如 "3天前"
  let lastPublishDaysFormatted = "未知";
  if (lastPost?.updatedAt) {
    const now = new Date();
    const updated = new Date(lastPost.updatedAt);
    const diffMs = now.getTime() - updated.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        lastPublishDaysFormatted = `${diffMinutes} 分钟前`;
      } else {
        lastPublishDaysFormatted = `${diffHours} 小时前`;
      }
    } else if (diffDays < 7) {
      lastPublishDaysFormatted = `${diffDays} 天前`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      lastPublishDaysFormatted = `${weeks} 周前`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      lastPublishDaysFormatted = `${months} 个月前`;
    } else {
      const years = Math.floor(diffDays / 365);
      lastPublishDaysFormatted = `${years} 年前`;
    }
  }

  return {
    posts: totalPosts,
    postsList, // 用于随机链接
    page,
    totalPage: totalPages,
    firstPage: firstPostNum,
    lastPage: lastPostNum,
    firstPublishAt: firstPublishAtFormatted,
    lastPublishDays: lastPublishDaysFormatted,
  };
}
