import type {
  ProjectsListBlockContent,
  ProjectsListData,
  ProjectsListSortMode,
} from "@/blocks/collection/ProjectsList/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import {
  findCategoryByPath,
  getAllDescendantIds,
} from "@/lib/server/category-utils";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import { getAllFeaturedImageUrls } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import { processImageUrl } from "@/lib/shared/image-common";
import { MEDIA_SLOTS } from "@/types/media";

import type { Prisma } from ".prisma/client";

const DISPLAY_LIMIT = 6;
const DEFAULT_SORT: ProjectsListSortMode = "publishedAt_desc";

const SORT_ORDER_MAP: Record<
  ProjectsListSortMode,
  Prisma.ProjectOrderByWithRelationInput[]
> = {
  publishedAt_desc: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  publishedAt_asc: [{ publishedAt: "asc" }, { createdAt: "asc" }],
  updatedAt_desc: [{ updatedAt: "desc" }],
  createdAt_desc: [{ createdAt: "desc" }],
  sortOrder_asc: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  stars_desc: [{ stars: "desc" }, { createdAt: "desc" }],
  forks_desc: [{ forks: "desc" }, { createdAt: "desc" }],
};

function resolveSortMode(sort: unknown): ProjectsListSortMode {
  if (typeof sort !== "string") {
    return DEFAULT_SORT;
  }

  if (Object.prototype.hasOwnProperty.call(SORT_ORDER_MAP, sort)) {
    return sort as ProjectsListSortMode;
  }

  return DEFAULT_SORT;
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

export async function projectsListFetcher(
  config: RuntimeBlockInput,
): Promise<ProjectsListData> {
  const content = (config.content || {}) as ProjectsListBlockContent;
  const data = (config.data || {}) as Record<string, unknown>;

  const filterBy = content.filterBy || "all";
  const slug: string | null = (data.slug as string) || null;
  const sort = resolveSortMode(content.projects?.sort);
  const showFeatured = content.projects?.showFeatured ?? true;
  const rawLimit = content.projects?.limit ?? DISPLAY_LIMIT;
  const limit = rawLimit === 0 ? undefined : Math.max(1, rawLimit);

  // 构建过滤条件
  const where: Prisma.ProjectWhereInput = {
    status: "PUBLISHED",
    ...(showFeatured ? {} : { isFeatured: false }),
  };

  if (filterBy === "tag" && slug) {
    where.tags = { some: { slug } };
  } else if (filterBy === "category" && slug) {
    const pathSlugs = slug.split("/").filter(Boolean);
    const parentCategory =
      pathSlugs.length > 0 ? await findCategoryByPath(pathSlugs) : null;

    if (parentCategory) {
      const descendantIds = await getAllDescendantIds(parentCategory.id);
      const allIds = [parentCategory.id, ...descendantIds];
      where.categories = { some: { id: { in: allIds } } };
    } else {
      return { displayProjects: [], totalProjects: 0 };
    }
  }

  const orderBy: Prisma.ProjectOrderByWithRelationInput[] = [
    ...(showFeatured ? [{ isFeatured: "desc" as const }] : []),
    ...SORT_ORDER_MAP[sort],
  ];

  const [projects, totalProjects] = await Promise.all([
    prisma.project.findMany({
      where,
      take: limit,
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
