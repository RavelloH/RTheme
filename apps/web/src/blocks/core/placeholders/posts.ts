import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理 {posts} 占位符
 * 返回已发布的文章总数和文章列表（用于随机链接）
 */
export async function postsInterpolator(): Promise<Record<string, unknown>> {
  const [totalPosts, allPosts] = await Promise.all([
    // 统计已发布文章数
    prisma.post.count({
      where: { status: "PUBLISHED", deletedAt: null },
    }),
    // 获取所有文章的 slug（用于随机链接）
    prisma.post.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: {
        slug: true,
      },
    }),
  ]);

  const postsList = allPosts.map((p) => `/${p.slug}`);

  return {
    posts: totalPosts,
    postsList, // 用于随机链接
  };
}
