import type {
  ArchiveListBlockConfig,
  ArchiveListData,
  ArchiveListMonthGroup,
  ArchiveListSortMode,
} from "@/blocks/collection/ArchiveList/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import prisma from "@/lib/server/prisma";

const DEFAULT_SORT: ArchiveListSortMode = "publishedAt_desc";

function normalizeSort(value: unknown): ArchiveListSortMode {
  if (value === "publishedAt_asc" || value === "publishedAt_desc") {
    return value;
  }
  return DEFAULT_SORT;
}

function padTo2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * ArchiveList Block Fetcher
 * 获取文章归档数据，并同时输出时间线与按月分组结构。
 */
export async function archiveListBlockFetcher(
  config: RuntimeBlockInput,
): Promise<ArchiveListData> {
  const content = (config.content || {}) as ArchiveListBlockConfig["content"];
  const dataSource = content.dataSource || "posts";

  if (dataSource !== "posts") {
    return { items: [], monthGroups: [] };
  }

  const sort = normalizeSort(content.sort);
  const direction = sort === "publishedAt_asc" ? "asc" : "desc";

  try {
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        publishedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        publishedAt: true,
      },
      orderBy: [{ publishedAt: direction }, { id: direction }],
    });

    const items = posts.flatMap((post) => {
      if (!post.publishedAt) {
        return [];
      }

      const date = post.publishedAt;
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();

      return [
        {
          id: String(post.id),
          title: post.title || "未命名文章",
          slug: post.slug || "",
          publishedAt: date.toISOString(),
          year,
          month,
          day,
          monthDay: `${padTo2(month)}/${padTo2(day)}`,
          yearMonthKey: `${year}-${padTo2(month)}`,
        },
      ];
    });

    const monthGroupMap = new Map<string, ArchiveListMonthGroup>();

    for (const item of items) {
      if (!monthGroupMap.has(item.yearMonthKey)) {
        monthGroupMap.set(item.yearMonthKey, {
          key: item.yearMonthKey,
          year: item.year,
          month: item.month,
          label: `${padTo2(item.month)}月`,
          items: [],
        });
      }

      const targetGroup = monthGroupMap.get(item.yearMonthKey);
      if (targetGroup) {
        targetGroup.items.push(item);
      }
    }

    return {
      items,
      monthGroups: Array.from(monthGroupMap.values()),
    };
  } catch (error) {
    console.error("[ArchiveList Fetcher] Error:", error);
    return {
      items: [],
      monthGroups: [],
    };
  }
}
