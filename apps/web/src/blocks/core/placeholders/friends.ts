import prisma from "@/lib/server/prisma";

/**
 * 插值器：处理 {friends} 占位符
 * 返回已发布的友链总数和友链列表（用于随机跳转）
 */
export async function friendsInterpolator(
  _params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const [totalFriends, allFriends] = await Promise.all([
    prisma.friendLink.count({
      where: {
        deletedAt: null,
        status: { in: ["PUBLISHED", "WHITELIST"] },
      },
    }),
    prisma.friendLink.findMany({
      where: {
        deletedAt: null,
        status: { in: ["PUBLISHED", "WHITELIST"] },
      },
      select: {
        url: true,
      },
    }),
  ]);

  const friendsList = allFriends.map((f) => f.url);

  return {
    friends: totalFriends,
    friendsList,
  };
}
