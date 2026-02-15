import type {
  FriendLinkItem,
  FriendLinksBlockConfig,
  FriendLinksData,
} from "@/blocks/collection/FriendLinks/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import prisma from "@/lib/server/prisma";

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 200;

function normalizeGroup(group: unknown): string | null {
  if (typeof group !== "string") {
    return null;
  }

  const trimmed = group.trim();
  return trimmed ? trimmed : null;
}

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

function normalizeWebsiteUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return "#";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function extractDomain(url: string): string {
  try {
    return new URL(normalizeWebsiteUrl(url)).hostname.replace(/^www\./i, "");
  } catch {
    return url.trim();
  }
}

function resolveAvatarUrl(url: string, avatar: string | null): string | null {
  const avatarText = avatar?.trim();
  if (!avatarText) {
    return null;
  }

  if (/^https?:\/\//i.test(avatarText)) {
    return avatarText;
  }

  const website = normalizeWebsiteUrl(url);
  try {
    return new URL(avatarText, website).toString();
  } catch {
    return avatarText;
  }
}

export async function friendLinksBlockFetcher(
  config: RuntimeBlockInput,
): Promise<FriendLinksData> {
  const content = (config.content || {}) as FriendLinksBlockConfig["content"];
  const limit = normalizeLimit(content.limit);
  const groupFilter = normalizeGroup(content.group);
  const randomEnabled = content.random ?? true;

  const rawLinks = await prisma.friendLink.findMany({
    where: {
      deletedAt: null,
      status: { in: ["PUBLISHED", "WHITELIST"] },
      ...(groupFilter ? { group: groupFilter } : {}),
    },
    select: {
      id: true,
      name: true,
      url: true,
      avatar: true,
      slogan: true,
      group: true,
      order: true,
    },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });

  const links: FriendLinkItem[] = rawLinks.map((item) => ({
    id: item.id,
    name: item.name,
    url: normalizeWebsiteUrl(item.url),
    avatar: resolveAvatarUrl(item.url, item.avatar),
    slogan: item.slogan,
    group: item.group,
    order: item.order,
    domain: extractDomain(item.url),
  }));

  return {
    links,
    total: rawLinks.length,
    groupFilter,
    randomEnabled,
    limit,
  };
}
