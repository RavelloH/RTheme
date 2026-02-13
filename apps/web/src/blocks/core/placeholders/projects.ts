import prisma from "@/lib/server/prisma";

const DISPLAY_STATUSES = ["PUBLISHED", "ARCHIVED", "DEVELOPING"] as const;

/**
 * 插值器：处理 {projects} 占位符
 * 返回已发布项目总数和项目链接列表（用于随机跳转）
 */
export async function projectsInterpolator(
  _params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  const [totalProjects, allProjects] = await Promise.all([
    prisma.project.count({
      where: {
        status: {
          in: [...DISPLAY_STATUSES],
        },
      },
    }),
    prisma.project.findMany({
      where: {
        status: {
          in: [...DISPLAY_STATUSES],
        },
      },
      select: {
        slug: true,
      },
    }),
  ]);

  const projectsList = allProjects.map(
    (project) => `/projects/${project.slug}`,
  );

  return {
    projects: totalProjects,
    projectsList,
  };
}
