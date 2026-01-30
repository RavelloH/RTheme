import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理 {posts} 占位符
 * 返回已发布的文章总数
 */
export async function postsInterpolator(): Promise<Record<string, unknown>> {
  const totalPosts = await prisma.post.count({
    where: { status: "PUBLISHED", deletedAt: null },
  });

  return {
    posts: totalPosts,
  };
}
