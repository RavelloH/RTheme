/**
 * 分类工具函数
 * 用于处理层级分类的各种操作
 */

import prisma from "@/lib/server/prisma";

/**
 * 构建分类树形结构
 * @param parentId 父分类 ID，null 表示从根开始
 * @param maxDepth 最大层级深度，undefined 表示无限制
 * @param currentDepth 当前深度（内部使用）
 */
export async function buildCategoryTree(
  parentId: number | null = null,
  maxDepth?: number,
  currentDepth: number = 0,
): Promise<
  Array<{
    id: number;
    slug: string;
    name: string;
    description: string | null;
    parentId: number | null;
    createdAt: Date;
    updatedAt: Date;
    postCount: number;
    children: unknown[];
  }>
> {
  // 如果达到最大深度，返回空数组
  if (maxDepth !== undefined && currentDepth >= maxDepth) {
    return [];
  }

  // 查询指定父分类下的所有子分类
  const categories = await prisma.category.findMany({
    where: {
      parentId: parentId,
    },
    include: {
      _count: {
        select: {
          posts: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  // 递归构建树形结构
  const tree = await Promise.all(
    categories.map(async (category) => {
      const children = await buildCategoryTree(
        category.id,
        maxDepth,
        currentDepth + 1,
      );
      return {
        ...category,
        postCount: category._count.posts,
        children,
      };
    }),
  );

  return tree;
}

/**
 * 验证分类移动是否会造成循环引用
 * @param categoryId 要移动的分类 ID
 * @param newParentId 新父分类 ID
 * @returns true 表示会造成循环引用，false 表示安全
 */
export async function validateCategoryMove(
  categoryId: number,
  newParentId: number | null,
): Promise<boolean> {
  // 如果移动到顶级（newParentId 为 null），肯定不会循环
  if (newParentId === null) {
    return false;
  }

  // 如果移动到自己，会造成循环
  if (categoryId === newParentId) {
    return true;
  }

  // 检查新父分类是否是当前分类的子孙分类
  let currentId: number | null = newParentId;

  while (currentId !== null) {
    if (currentId === categoryId) {
      // 新父分类是当前分类的子孙，会造成循环
      return true;
    }

    // 查找当前分类的父分类
    const category: { parentId: number | null } | null =
      await prisma.category.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

    if (!category) {
      break;
    }

    currentId = category.parentId;
  }

  return false;
}

/**
 * 获取分类的完整路径（slug 数组）
 * @param categoryId 分类 ID
 * @returns slug 数组，从根到当前分类
 */
export async function getCategoryPath(categoryId: number): Promise<string[]> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      slug: true,
      parentId: true,
    },
  });

  if (!category) {
    return [];
  }

  // 如果没有父分类，返回当前分类的 slug
  if (category.parentId === null) {
    return [category.slug];
  }

  // 递归获取父分类的路径
  const parentPath = await getCategoryPath(category.parentId);
  return [...parentPath, category.slug];
}

/**
 * 获取分类的完整路径（名称数组，用于面包屑导航）
 * @param categoryId 分类 ID
 * @returns 名称数组，从根到当前分类
 */
export async function getCategoryNamePath(
  categoryId: number,
): Promise<string[]> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      name: true,
      parentId: true,
    },
  });

  if (!category) {
    return [];
  }

  // 如果没有父分类，返回当前分类的名称
  if (category.parentId === null) {
    return [category.name];
  }

  // 递归获取父分类的路径
  const parentPath = await getCategoryNamePath(category.parentId);
  return [...parentPath, category.name];
}

/**
 * 获取所有子孙分类的 ID
 * @param categoryId 分类 ID
 * @returns 包含所有子孙分类的 ID 数组（不包含当前分类）
 */
export async function getAllDescendantIds(
  categoryId: number,
): Promise<number[]> {
  const children = await prisma.category.findMany({
    where: {
      parentId: categoryId,
    },
    select: {
      id: true,
    },
  });

  if (children.length === 0) {
    return [];
  }

  // 递归获取每个子分类的子孙
  const descendants = await Promise.all(
    children.map((child) => getAllDescendantIds(child.id)),
  );

  // 合并所有子分类的 ID 和它们的子孙 ID
  const childIds = children.map((child) => child.id);
  const descendantIds = descendants.flat();

  return [...childIds, ...descendantIds];
}

/**
 * 计算分类的层级深度
 * @param categoryId 分类 ID
 * @returns 深度值，顶级分类为 0
 */
export async function calculateCategoryDepth(
  categoryId: number,
): Promise<number> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { parentId: true },
  });

  if (!category) {
    return 0;
  }

  if (category.parentId === null) {
    return 0;
  }

  // 递归计算父分类的深度
  const parentDepth = await calculateCategoryDepth(category.parentId);
  return parentDepth + 1;
}

/**
 * 递归统计分类及其所有子孙分类的文章总数
 * @param categoryId 分类 ID
 * @returns 文章总数
 */
export async function countCategoryPosts(categoryId: number): Promise<number> {
  // 统计直属文章数
  const directPostCount = await prisma.post.count({
    where: {
      categories: {
        some: {
          id: categoryId,
        },
      },
      deletedAt: null,
    },
  });

  // 获取所有子分类
  const children = await prisma.category.findMany({
    where: {
      parentId: categoryId,
    },
    select: {
      id: true,
    },
  });

  // 递归统计子分类的文章数
  const childPostCounts = await Promise.all(
    children.map((child) => countCategoryPosts(child.id)),
  );

  const totalChildPostCount = childPostCounts.reduce(
    (sum, count) => sum + count,
    0,
  );

  return directPostCount + totalChildPostCount;
}

/**
 * 验证同级分类的唯一性（slug 和 name）
 * @param name 分类名称
 * @param slug 分类 slug
 * @param parentId 父分类 ID
 * @param excludeId 排除的分类 ID（用于更新时排除自己）
 * @returns { slugExists, nameExists } 对象
 */
export async function checkCategoryUniqueness(
  name: string,
  slug: string,
  parentId: number | null,
  excludeId?: number,
): Promise<{ slugExists: boolean; nameExists: boolean }> {
  const where = {
    parentId,
    ...(excludeId && { id: { not: excludeId } }),
  };

  const [slugExists, nameExists] = await Promise.all([
    prisma.category.findFirst({
      where: {
        ...where,
        slug,
      },
    }),
    prisma.category.findFirst({
      where: {
        ...where,
        name,
      },
    }),
  ]);

  return {
    slugExists: !!slugExists,
    nameExists: !!nameExists,
  };
}

/**
 * 获取分类的父级路径（名称数组，不包含当前分类）
 * @param categoryId 分类 ID
 * @returns 名称数组，从根到父分类（不包含当前分类）
 */
export async function getCategoryParentNamePath(
  categoryId: number,
): Promise<string[]> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: {
      parentId: true,
    },
  });

  if (!category || category.parentId === null) {
    return [];
  }

  // 递归获取父分类的完整路径
  return getCategoryNamePath(category.parentId);
}

/**
 * 根据 slug 路径查找分类
 * @param pathSlugs slug 数组路径，例如 ["tech", "web", "frontend"]
 * @returns 分类对象，如果不存在返回 null
 */
export async function findCategoryByPath(pathSlugs: string[]): Promise<{
  id: number;
  slug: string;
  name: string;
  description: string | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  if (pathSlugs.length === 0) {
    return null;
  }

  // 从根开始逐级查找
  let currentParentId: number | null = null;

  for (const slug of pathSlugs) {
    const category: {
      id: number;
      slug: string;
      name: string;
      description: string | null;
      parentId: number | null;
      createdAt: Date;
      updatedAt: Date;
    } | null = await prisma.category.findFirst({
      where: {
        slug,
        parentId: currentParentId,
      },
    });

    if (!category) {
      return null;
    }

    currentParentId = category.id;
  }

  // 返回最后一个分类
  const finalCategory = await prisma.category.findFirst({
    where: {
      slug: pathSlugs[pathSlugs.length - 1],
      parentId:
        pathSlugs.length > 1
          ? (
              await prisma.category.findFirst({
                where: {
                  slug: pathSlugs[pathSlugs.length - 2],
                },
              })
            )?.id || null
          : null,
    },
  });

  return finalCategory;
}

/**
 * 统计分类的直接子分类数量
 * @param categoryId 分类 ID
 * @returns 直接子分类数量
 */
export async function countDirectChildren(categoryId: number): Promise<number> {
  return prisma.category.count({
    where: {
      parentId: categoryId,
    },
  });
}

/**
 * 统计分类的所有子孙分类数量
 * @param categoryId 分类 ID
 * @returns 所有子孙分类数量
 */
export async function countAllDescendants(categoryId: number): Promise<number> {
  const descendantIds = await getAllDescendantIds(categoryId);
  return descendantIds.length;
}

/**
 * 批量获取分类路径映射
 * @param categoryIds 需要获取路径的分类ID数组
 * @returns Map<categoryId, fullPath> 完整路径映射
 */
export async function batchGetCategoryPaths(
  categoryIds: number[],
): Promise<Map<number, { name: string; slug: string }[]>> {
  if (categoryIds.length === 0) {
    return new Map();
  }

  // 方案：一次性获取所有分类（假设分类总数不会太多）
  // 对于内容管理系统来说，分类数量通常是有限的，这个方案是可行的
  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  // 构建ID到分类的映射
  const categoryMap = new Map(
    allCategories.map((cat) => [
      cat.id,
      { name: cat.name, slug: cat.slug, parentId: cat.parentId },
    ]),
  );

  // 为每个请求的分类计算路径
  const pathMap = new Map<number, { name: string; slug: string }[]>();

  for (const categoryId of categoryIds) {
    const path = buildPathFromCache(categoryId, categoryMap);
    pathMap.set(categoryId, path);
  }

  return pathMap;
}

/**
 * 从缓存构建路径
 */
function buildPathFromCache(
  categoryId: number,
  categoryMap: Map<
    number,
    { name: string; slug: string; parentId: number | null }
  >,
): { name: string; slug: string }[] {
  const path: { name: string; slug: string }[] = [];
  let currentId: number | null = categoryId;
  let iterationCount = 0;
  const maxIterations = 100; // 防止循环引用的安全措施

  while (currentId !== null && iterationCount < maxIterations) {
    const category = categoryMap.get(currentId);
    if (!category) break;

    path.unshift({ name: category.name, slug: category.slug });
    currentId = category.parentId;
    iterationCount++;
  }

  return path;
}
