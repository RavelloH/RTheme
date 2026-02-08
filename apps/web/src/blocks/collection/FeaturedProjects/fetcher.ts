import type {
  FeaturedProjectsBlockContent,
  FeaturedProjectsData,
} from "@/blocks/collection/FeaturedProjects/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import { getAllFeaturedImageUrls } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import { processImageUrl } from "@/lib/shared/image-common";
import { MEDIA_SLOTS } from "@/types/media";

import type { Prisma } from ".prisma/client";

function normalizeCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(8, Math.max(1, Math.floor(parsed)));
}

function normalizeDescription(description: string): string {
  const compact = description.replace(/\s+/g, " ").trim();
  return compact || "暂无项目描述。";
}

function normalizeLanguages(languages: Prisma.JsonValue): string[] {
  if (!languages) {
    return [];
  }

  if (Array.isArray(languages)) {
    return languages.filter((item): item is string => typeof item === "string");
  }

  if (typeof languages !== "object") {
    return [];
  }

  const langEntries = Object.entries(languages as Record<string, unknown>).map(
    ([name, score]) => ({
      name,
      score: typeof score === "number" ? score : 0,
    }),
  );

  langEntries.sort((a, b) => b.score - a.score);
  return langEntries.map((item) => item.name);
}

function normalizeLinks(input: {
  demoUrl: string | null;
  repoUrl: string | null;
  urls: string[];
}): string[] {
  const links = new Set<string>();

  const candidates: Array<string | null | undefined> = [
    input.demoUrl,
    input.repoUrl,
    ...input.urls,
  ];

  for (const item of candidates) {
    if (!item || typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    links.add(trimmed);
  }

  return Array.from(links);
}

export async function featuredProjectsFetcher(
  config: RuntimeBlockInput,
): Promise<FeaturedProjectsData> {
  const content = (config.content || {}) as FeaturedProjectsBlockContent;

  const count = normalizeCount(content.projects?.count);
  const onlyFeatured = content.projects?.onlyFeatured ?? true;

  const where: Prisma.ProjectWhereInput = {
    status: "PUBLISHED",
    ...(onlyFeatured ? { isFeatured: true } : {}),
  };

  const orderBy: Prisma.ProjectOrderByWithRelationInput[] = onlyFeatured
    ? [{ sortOrder: "asc" }, { publishedAt: "desc" }]
    : [{ isFeatured: "desc" }, { sortOrder: "asc" }, { publishedAt: "desc" }];

  const [projects, totalProjects] = await Promise.all([
    prisma.project.findMany({
      where,
      take: count,
      orderBy,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        stars: true,
        forks: true,
        languages: true,
        license: true,
        startedAt: true,
        completedAt: true,
        demoUrl: true,
        repoUrl: true,
        urls: true,
        isFeatured: true,
        mediaRefs: {
          where: {
            slot: MEDIA_SLOTS.PROJECT_FEATURED_IMAGE,
          },
          include: {
            media: {
              select: {
                shortHash: true,
                width: true,
                height: true,
                blur: true,
              },
            },
          },
        },
      },
    }),
    prisma.project.count({ where }),
  ]);

  if (projects.length === 0) {
    return {
      displayProjects: [],
      totalProjects,
    };
  }

  const projectImageMap = new Map<number, string[]>();
  const allImageUrls: string[] = [];

  for (const project of projects) {
    const imageUrls = getAllFeaturedImageUrls(project.mediaRefs);
    projectImageMap.set(project.id, imageUrls);
    allImageUrls.push(...imageUrls);
  }

  const mediaFileMap = await batchQueryMediaFiles(allImageUrls);

  const displayProjects = projects.map((project) => {
    const imageUrls = projectImageMap.get(project.id) || [];
    const images =
      imageUrls.length > 0
        ? processImageUrl(imageUrls.join(","), mediaFileMap)
        : [];

    return {
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: normalizeDescription(project.description),
      stars: project.stars,
      forks: project.forks,
      languages: normalizeLanguages(project.languages),
      license: project.license,
      startedAt: project.startedAt,
      completedAt: project.completedAt,
      links: normalizeLinks({
        demoUrl: project.demoUrl,
        repoUrl: project.repoUrl,
        urls: project.urls,
      }),
      images,
      isFeatured: project.isFeatured,
    };
  });

  return {
    displayProjects,
    totalProjects,
  };
}
