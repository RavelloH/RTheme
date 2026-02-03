import prisma from "@/lib/server/prisma";

/**
 * 最近更新时间插值器（全局）
 * 返回最后一篇更新文章的时间，适用于所有页面
 *
 * 此插值器不需要任何参数，始终返回最后一篇更新文章的时间
 */
export async function lastPublishDaysInterpolator(
  _params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  // 获取最后一篇更新文章的时间
  const lastUpdatedPost = await prisma.post.findFirst({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  const lastUpdateDate = lastUpdatedPost?.updatedAt || new Date();

  return {
    lastPublishDays: lastUpdateDate.toISOString(),
  };
}
