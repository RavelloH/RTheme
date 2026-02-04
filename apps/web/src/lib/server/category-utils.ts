/**
 * 分类工具函数
 * 用于处理层级分类的各种操作
 */

import prisma from "@/lib/server/prisma";

const PATH_SEPARATOR = "/";

interface CategoryTreeNode {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
  postCount: number;
  children: CategoryTreeNode[];
}

/**
 * 构建分类树形结构
 * @param parentId 父分类 ID，null 表示从根开始
 * @param maxDepth 最大层级深度，undefined 表示无限制
 */
export async function buildCategoryTree(
  parentId: number | null = null,
  maxDepth?: number,
): Promise<CategoryTreeNode[]> {
  // 优化：使用一次查询获取所有相关分类，然后在内存中组装
  // 如果是从根开始，获取所有分类；如果指定 parentId，获取该子树
  let categories;

  if (parentId === null) {
    // 获取所有分类
    categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            posts: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [
        { depth: "asc" }, // 按深度排序，确保父级先被处理
        { order: "asc" },
        { name: "asc" },
      ],
    });
  } else {
    // 获取指定子树
    const parent = await prisma.category.findUnique({
      where: { id: parentId },
      select: { path: true },
    });

    if (!parent) return [];

    // path 格式：包含自己的 ID，格式如 "5/10/15"（与 Comment 一致）
    const prefix = `${parent.path}${PATH_SEPARATOR}`;

    categories = await prisma.category.findMany({
      where: {
        OR: [
          { parentId: parentId }, // 直接子级
          { path: { startsWith: prefix } }, // 所有后代
        ],
      },
      include: {
        _count: {
          select: {
            posts: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [{ depth: "asc" }, { order: "asc" }, { name: "asc" }],
    });
  }

  // 内存构建树
  const categoryMap = new Map<number, CategoryTreeNode>();
  const roots: CategoryTreeNode[] = [];

  // 初始化映射
  categories.forEach((cat) => {
    categoryMap.set(cat.id, {
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      parentId: cat.parentId,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      postCount: cat._count.posts,
      children: [],
    });
  });

  // 组装树
  categories.forEach((cat) => {
    const node = categoryMap.get(cat.id);
    if (!node) return;

    // 如果我们要构建整个树（parentId=null），则 parentId=null 的是根
    // 如果我们要构建子树，则 parentId=targetParentId 的是根
    if (
      cat.parentId === null ||
      (parentId !== null && cat.parentId === parentId) ||
      !categoryMap.has(cat.parentId)
    ) {
      roots.push(node);
    } else {
      const parentNode = categoryMap.get(cat.parentId);
      if (parentNode) {
        parentNode.children.push(node);
      }
    }
  });

  // 过滤深度（如果提供了 maxDepth）
  // 注意：这里的 maxDepth 是相对当前查询根节点的深度
  if (maxDepth !== undefined) {
    const filterDepth = (
      nodes: CategoryTreeNode[],
      depth: number,
    ): CategoryTreeNode[] => {
      if (depth >= maxDepth) return [];
      return nodes.map((node) => ({
        ...node,
        children: filterDepth(node.children, depth + 1),
      }));
    };
    return filterDepth(roots, 0);
  }

  return roots;
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

  // 优化：直接查询新父级的 path
  const newParent = await prisma.category.findUnique({
    where: { id: newParentId },
    select: { path: true },
  });

  if (!newParent) return false; // 父级不存在，虽然后续会报错，但这里不算循环引用

  // 检查路径中是否包含当前 ID
  // path 格式：包含自己的 ID，格式如 "5/10/15"（与 Comment 一致）
  const pathIds = newParent.path
    .split(PATH_SEPARATOR)
    .filter((p) => p)
    .map(Number);

  return pathIds.includes(categoryId);
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
      path: true,
    },
  });

  if (!category) {
    return [];
  }

  // 解析 path 中的 ID
  // path 格式：包含自己的 ID，格式如 "5/10/15"（与 Comment 一致）
  // 需要排除最后一个（自己的 ID）
  const ancestorIds = category.path
    .split(PATH_SEPARATOR)
    .filter((p) => p)
    .map(Number)
    .slice(0, -1);

  if (ancestorIds.length === 0) {
    return [category.slug];
  }

  // 批量查询祖先 slug
  const ancestors = await prisma.category.findMany({
    where: { id: { in: ancestorIds } },
    select: { id: true, slug: true },
  });

  // 按路径顺序排序
  const ancestorMap = new Map(ancestors.map((a) => [a.id, a.slug]));
  const pathSlugs = ancestorIds
    .map((id) => ancestorMap.get(id))
    .filter((s): s is string => s !== undefined);

  return [...pathSlugs, category.slug];
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
      path: true,
    },
  });

  if (!category) {
    return [];
  }

  // path 格式：包含自己的 ID，格式如 "5/10/15"（与 Comment 一致）
  // 需要排除最后一个（自己的 ID）
  const ancestorIds = category.path
    .split(PATH_SEPARATOR)
    .filter((p) => p)
    .map(Number)
    .slice(0, -1);

  if (ancestorIds.length === 0) {
    return [category.name];
  }

  const ancestors = await prisma.category.findMany({
    where: { id: { in: ancestorIds } },
    select: { id: true, name: true },
  });

  const ancestorMap = new Map(ancestors.map((a) => [a.id, a.name]));
  const pathNames = ancestorIds
    .map((id) => ancestorMap.get(id))
    .filter((n): n is string => n !== undefined);

  return [...pathNames, category.name];
}

/**
 * 获取所有子孙分类的 ID
 * @param categoryId 分类 ID
 * @returns 包含所有子孙分类的 ID 数组（不包含当前分类）
 */
export async function getAllDescendantIds(
  categoryId: number,
): Promise<number[]> {
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { path: true },
  });

  if (!category) return [];

  // 使用 path 前缀匹配（高性能）
  // path 格式：包含自己的 ID，格式如 "5/10/15"（与 Comment 一致）
  const prefix = `${category.path}${PATH_SEPARATOR}`;

  const descendants = await prisma.category.findMany({
    where: {
      path: { startsWith: prefix },
    },
    select: { id: true },
  });

  return descendants.map((d) => d.id);
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
    select: { depth: true },
  });

  return category?.depth ?? 0;
}

/**
 * 递归统计分类及其所有子孙分类的文章总数
 * @param categoryId 分类 ID
 * @returns 文章总数
 */
export async function countCategoryPosts(categoryId: number): Promise<number> {
  // 1. 获取所有子孙 ID
  const descendantIds = await getAllDescendantIds(categoryId);
  const allIds = [categoryId, ...descendantIds];

  // 2. 统计文章数（使用 distinct 避免一篇文章属于多个子分类被重复统计）
  // 注意：Prisma 的 count 不支持 distinct，所以如果文章属于多个分类，这里原本的逻辑可能会有重复。
  // 但业务逻辑上，"分类下的文章数"通常指属于该分类或子分类的文章总数去重。
  const count = await prisma.post.count({
    where: {
      categories: {
        some: {
          id: { in: allIds },
        },
      },
      deletedAt: null,
    },
  });

  return count;
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
      id: true,
      path: true,
      parentId: true,
    },
  });

  if (!category || !category.path) {
    return [];
  }

  // path 格式：包含自己的 ID，格式如 "5/10/15"（与 Comment 一致）
  // 需要排除最后一个（自己的 ID）
  const ancestorIds = category.path
    .split(PATH_SEPARATOR)
    .filter((p) => p)
    .map(Number)
    .slice(0, -1);

  if (ancestorIds.length === 0) return [];

  const ancestors = await prisma.category.findMany({
    where: { id: { in: ancestorIds } },
    select: { id: true, name: true },
  });

  const ancestorMap = new Map(ancestors.map((a) => [a.id, a.name]));
  return ancestorIds
    .map((id) => ancestorMap.get(id))
    .filter((n): n is string => n !== undefined);
}

interface CategoryBasicInfo {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  parentId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 根据 slug 路径查找分类（优化版：使用 fullSlug 字段）
 * @param pathSlugs slug 数组路径，例如 ["tech", "web", "frontend"]
 * @returns 分类对象，如果不存在返回 null
 */
export async function findCategoryByPath(
  pathSlugs: string[],
): Promise<CategoryBasicInfo | null> {
  if (pathSlugs.length === 0) {
    return null;
  }

  // 构建 fullSlug：用 "/" 连接所有 slug
  const fullSlug = pathSlugs.join("/");

  // 单次查询，利用 fullSlug 索引
  const category = await prisma.category.findUnique({
    where: { fullSlug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      parentId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return category;
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

  // 1. 获取目标分类及其当前 path 信息
  const targets = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, path: true, name: true, slug: true, parentId: true },
  });

  // 2. 收集所有需要的祖先 ID
  // path 格式：包含自己的 ID，格式如 "5/10/15"（与 Comment 一致）
  const allAncestorIds = new Set<number>();
  targets.forEach((t) => {
    t.path.split(PATH_SEPARATOR).forEach((p) => {
      if (p) allAncestorIds.add(Number(p));
    });
  });

  // 3. 批量获取祖先信息
  const ancestors = await prisma.category.findMany({
    where: { id: { in: Array.from(allAncestorIds) } },
    select: { id: true, name: true, slug: true },
  });

  const ancestorMap = new Map(ancestors.map((a) => [a.id, a]));
  const resultMap = new Map<number, { name: string; slug: string }[]>();

  targets.forEach((t) => {
    // 需要排除最后一个（自己的 ID）
    const pathIds = t.path
      .split(PATH_SEPARATOR)
      .filter((p) => p)
      .map(Number)
      .slice(0, -1);

    const path: { name: string; slug: string }[] = [];
    let currentSlugPath = "";

    pathIds.forEach((id) => {
      const ancestor = ancestorMap.get(id);
      if (ancestor) {
        currentSlugPath = currentSlugPath
          ? `${currentSlugPath}/${ancestor.slug}`
          : ancestor.slug;
        path.push({ name: ancestor.name, slug: currentSlugPath });
      }
    });

    // 加上自己
    currentSlugPath = currentSlugPath ? `${currentSlugPath}/${t.slug}` : t.slug;
    path.push({ name: t.name, slug: currentSlugPath });

    resultMap.set(t.id, path);
  });

  return resultMap;
}
