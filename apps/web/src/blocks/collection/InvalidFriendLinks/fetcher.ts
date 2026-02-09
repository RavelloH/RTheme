import type {
  InvalidFriendLinkItem,
  InvalidFriendLinksBlockConfig,
  InvalidFriendLinksData,
  InvalidFriendReason,
} from "@/blocks/collection/InvalidFriendLinks/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import prisma from "@/lib/server/prisma";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function normalizeLimit(limit: unknown): number | null {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  const normalized = Math.floor(limit);
  if (normalized <= 0) {
    return null;
  }

  return Math.min(normalized, MAX_LIMIT);
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "#";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function toReasonText(reason: InvalidFriendReason): string {
  if (reason === "NO_BACKLINK") {
    return "无回链";
  }

  return "无法访问";
}

function formatDuration(start: Date, end: Date): string | null {
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) {
    return "不足 1 分钟";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  if (totalMinutes < 1) {
    return "不足 1 分钟";
  }

  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} 天`);
  }
  if (hours > 0) {
    parts.push(`${hours} 小时`);
  }
  if (minutes > 0 && parts.length < 2) {
    parts.push(`${minutes} 分钟`);
  }

  return parts.length > 0 ? parts.join(" ") : "不足 1 分钟";
}

function mapToInvalidItem(item: {
  id: number;
  name: string;
  url: string;
  status: InvalidFriendReason;
  lastCheckedAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): InvalidFriendLinkItem {
  const invalidAt = item.lastCheckedAt || item.updatedAt;
  const startAt = item.publishedAt || item.createdAt;
  const validDuration = formatDuration(startAt, invalidAt || new Date());

  return {
    id: item.id,
    name: item.name,
    url: normalizeUrl(item.url),
    reason: item.status,
    reasonText: toReasonText(item.status),
    lastCheckedAt: invalidAt ? invalidAt.toISOString() : null,
    validDuration,
  };
}

export async function invalidFriendLinksBlockFetcher(
  config: RuntimeBlockInput,
): Promise<InvalidFriendLinksData> {
  const content = (config.content ||
    {}) as InvalidFriendLinksBlockConfig["content"];
  const limit = normalizeLimit(content.limit);

  const rawLinks = await prisma.friendLink.findMany({
    where: {
      status: { in: ["DISCONNECT", "NO_BACKLINK"] },
    },
    select: {
      id: true,
      name: true,
      url: true,
      status: true,
      lastCheckedAt: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ lastCheckedAt: "desc" }, { updatedAt: "desc" }, { id: "desc" }],
    ...(limit !== null ? { take: limit } : {}),
  });

  const links = rawLinks.map((item) =>
    mapToInvalidItem({
      id: item.id,
      name: item.name,
      url: item.url,
      status: item.status as InvalidFriendReason,
      lastCheckedAt: item.lastCheckedAt,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }),
  );

  return {
    links,
    total: links.length,
  };
}
