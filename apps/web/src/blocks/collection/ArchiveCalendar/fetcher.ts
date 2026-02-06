import type {
  ArchiveCalendarBlockConfig,
  DayData,
  YearData,
} from "@/blocks/collection/ArchiveCalendar/types";
import type { BlockConfig } from "@/blocks/core/types";
import prisma from "@/lib/server/prisma";

/**
 * 生成某年所有日期的数组
 */
function generateYearDays(year: number): string[] {
  const days: string[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
  }

  return days;
}

/**
 * ArchiveCalendar Block Fetcher
 * 从数据库获取文章归档数据
 */
export async function archiveCalendarBlockFetcher(
  config: BlockConfig,
): Promise<Record<string, unknown>> {
  const content = config.content as ArchiveCalendarBlockConfig["content"];
  const dataSource = content.dataSource || "posts";
  const yearsToShow = content.years || 3;

  if (dataSource !== "posts") {
    return {};
  }

  try {
    // 获取所有已发布文章的发布日期
    const posts = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: {
        publishedAt: true,
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    // 按年月统计
    const yearMonthMap = new Map<number, Map<number, number>>();
    // 按年日统计
    const yearDayMap = new Map<number, Map<string, number>>();

    for (const post of posts) {
      if (!post.publishedAt) continue;

      const year = post.publishedAt.getFullYear();
      const month = post.publishedAt.getMonth() + 1; // 1-12
      const dateStr = post.publishedAt.toISOString().slice(0, 10); // YYYY-MM-DD

      // 月统计
      if (!yearMonthMap.has(year)) {
        yearMonthMap.set(year, new Map());
      }
      const monthMap = yearMonthMap.get(year)!;
      monthMap.set(month, (monthMap.get(month) || 0) + 1);

      // 日统计
      if (!yearDayMap.has(year)) {
        yearDayMap.set(year, new Map());
      }
      const dayMap = yearDayMap.get(year)!;
      dayMap.set(dateStr, (dayMap.get(dateStr) || 0) + 1);
    }

    // 转换为数组格式，只取最近的 yearsToShow 年
    const currentYear = new Date().getFullYear();
    const archiveData: YearData[] = [];

    for (let i = 0; i < yearsToShow; i++) {
      const year = currentYear - i;
      const monthMap = yearMonthMap.get(year);
      const dayMap = yearDayMap.get(year);

      const months = [];
      let total = 0;

      for (let m = 1; m <= 12; m++) {
        const count = monthMap?.get(m) || 0;
        months.push({ month: m, count });
        total += count;
      }

      // 生成全年每一天的数据
      const yearDays = generateYearDays(year);
      const days: DayData[] = yearDays.map((date) => ({
        date,
        count: dayMap?.get(date) || 0,
      }));

      archiveData.push({ year, months, days, total });
    }

    return { archiveData };
  } catch (error) {
    console.error("[ArchiveCalendar Fetcher] Error:", error);
    return { archiveData: [] };
  }
}
