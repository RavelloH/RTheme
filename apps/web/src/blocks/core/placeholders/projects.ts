/**
 * 插值器：处理 {projects} 占位符
 * 返回项目总数
 *
 * TODO: 当项目系统实现后，从数据库查询实际数量
 */
export async function projectsInterpolator(
  _params?: Record<string, string>,
): Promise<Record<string, unknown>> {
  // 目前返回固定值，待项目系统实现后更新
  return {
    projects: 5,
  };
}
