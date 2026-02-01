import { fetchBlockInterpolatedData } from "@/blocks/core/lib/server";
import type { BlockConfig } from "@/blocks/core/types";
import prisma from "@/lib/server/prisma";

// 定义通用返回类型，方便前端使用
type DisplayItem = {
  id?: number | string; // 为了兼容 Tag (slug) 和 Category (id)
  slug: string;
  name: string;
  count: number;
  isPlaceholder?: boolean;
};

export async function tagsCategoriesFetcher(config: BlockConfig) {
  // 0. 启动插值数据获取
  const interpolatedPromise = fetchBlockInterpolatedData(config.content);

  // 统一过滤条件：只统计未删除且已发布文章
  // 注意：上一段代码中你用了 status: "PUBLISHED"，这里建议保持一致
  const postFilter = {
    deletedAt: null,
    status: "PUBLISHED" as const,
  };

  const [tags, allCategories] = await Promise.all([
    // 1. Tag 优化：直接在数据库层完成计数、排序、截取
    // 这样无论你有多少 Tag，内存消耗都是恒定的
    prisma.tag.findMany({
      where: {
        posts: {
          some: postFilter, // 只查询至少有一篇有效文章的标签
        },
      },
      select: {
        slug: true,
        name: true,
        _count: {
          select: {
            posts: {
              where: postFilter,
            },
          },
        },
      },
      orderBy: {
        posts: {
          _count: "desc",
        },
      },
      take: 6,
    }),

    // 2. Category 优化：只取 ID、ParentID 和直接文章数
    // 由于需要计算树状累加，这里必须取回所有分类，但数据体量非常轻
    prisma.category.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        parentId: true,
        _count: {
          select: {
            posts: {
              where: postFilter,
            },
          },
        },
      },
    }),
  ]);

  // --- 处理 Tags ---

  const displayTags: DisplayItem[] = tags.map((tag) => ({
    slug: tag.slug,
    name: tag.name,
    count: tag._count.posts,
  }));

  fillPlaceholders(displayTags, 6, "tag");

  // --- 处理 Categories (递归计算) ---

  // 构建 Map 以便 O(1) 访问
  const categoryMap = new Map<number, (typeof allCategories)[0]>();
  // 顺便建立父子关系索引，避免每次都遍历数组寻找 children
  const childrenMap = new Map<number, number[]>();

  allCategories.forEach((cat) => {
    categoryMap.set(cat.id, cat);
    if (cat.parentId) {
      const siblings = childrenMap.get(cat.parentId) || [];
      siblings.push(cat.id);
      childrenMap.set(cat.parentId, siblings);
    }
  });

  // 递归计算函数
  const getCumulativeCount = (catId: number): number => {
    const cat = categoryMap.get(catId);
    if (!cat) return 0;

    const directCount = cat._count.posts;
    const childrenIds = childrenMap.get(catId) || [];

    const childrenCount = childrenIds.reduce(
      (sum, childId) => sum + getCumulativeCount(childId),
      0,
    );

    return directCount + childrenCount;
  };

  // 处理根分类并排序
  const displayCategories: DisplayItem[] = allCategories
    .filter((cat) => cat.parentId === null) // 只从根节点开始
    .map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      name: cat.name,
      count: getCumulativeCount(cat.id),
    }))
    .filter((cat) => cat.count > 0 && cat.slug !== "uncategorized")
    .sort((a, b) => b.count - a.count) // JS 端排序
    .slice(0, 6); // 取前6个

  fillPlaceholders(displayCategories, 6, "category");

  const interpolatedData = await interpolatedPromise;

  return {
    displayTags,
    displayCategories,
    ...interpolatedData,
  };
}

/**
 * 辅助函数：填充占位符
 * 修改了原数组 (Mutable)
 */
function fillPlaceholders(
  items: DisplayItem[],
  targetLength: number,
  prefix: string,
) {
  const missingCount = Math.max(0, targetLength - items.length);
  for (let i = 0; i < missingCount; i++) {
    items.push({
      id: -1 - i,
      slug: `placeholder-${prefix}-${i}`,
      name: "---",
      count: 0,
      isPlaceholder: true,
    });
  }
}
