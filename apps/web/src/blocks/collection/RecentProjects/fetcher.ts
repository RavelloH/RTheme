import type {
  ProjectsBlockContent,
  ProjectsData,
  ProjectsSortMode,
} from "@/blocks/collection/RecentProjects/types";
import type { RuntimeBlockInput } from "@/blocks/core/definition";
import { batchQueryMediaFiles } from "@/lib/server/image-query";
import { getAllFeaturedImageUrls } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import { processImageUrl } from "@/lib/shared/image-common";
import { MEDIA_SLOTS } from "@/types/media";

import type { Prisma } from ".prisma/client";

const DISPLAY_LIMIT = 3;
const DEFAULT_SORT: ProjectsSortMode = "publishedAt_desc";

const SORT_ORDER_MAP: Record<
  ProjectsSortMode,
  Prisma.ProjectOrderByWithRelationInput[]
> = {
  publishedAt_desc: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  publishedAt_asc: [{ publishedAt: "asc" }, { createdAt: "asc" }],
  updatedAt_desc: [{ updatedAt: "desc" }],
  createdAt_desc: [{ createdAt: "desc" }],
  sortOrder_asc: [{ sortOrder: "desc" }, { createdAt: "desc" }],
  stars_desc: [{ stars: "desc" }, { createdAt: "desc" }],
  forks_desc: [{ forks: "desc" }, { createdAt: "desc" }],
};

function resolveSortMode(sort: unknown): ProjectsSortMode {
  if (typeof sort !== "string") {
    return DEFAULT_SORT;
  }

  if (Object.prototype.hasOwnProperty.call(SORT_ORDER_MAP, sort)) {
    return sort as ProjectsSortMode;
  }

  return DEFAULT_SORT;
}

function normalizeDescription(description: string): string {
  const compact = description.replace(/\s+/g, " ").trim();
  if (!compact) {
    return "暂无项目描述。";
  }

  const maxLength = 50;
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength)}...`;
}

export async function projectsFetcher(
  config: RuntimeBlockInput,
): Promise<ProjectsData> {
  const content = (config.content || {}) as ProjectsBlockContent;

  const sort = resolveSortMode(content.projects?.sort);
  const showFeatured = content.projects?.showFeatured ?? true;
  const onlyWithCover = content.projects?.onlyWithCover ?? false;

  const where: Prisma.ProjectWhereInput = {
    status: "PUBLISHED",
  };

  if (onlyWithCover) {
    where.mediaRefs = {
      some: {
        slot: MEDIA_SLOTS.PROJECT_FEATURED_IMAGE,
      },
    };
  }

  const orderBy: Prisma.ProjectOrderByWithRelationInput[] = [
    ...(showFeatured ? [{ isFeatured: "desc" as const }] : []),
    ...SORT_ORDER_MAP[sort],
  ];

  const [projects, totalProjects, filteredProjects] = await Promise.all([
    prisma.project.findMany({
      where,
      take: DISPLAY_LIMIT,
      orderBy,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        isFeatured: true,
        publishedAt: true,
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
    prisma.project.count({
      where: {
        status: "PUBLISHED",
      },
    }),
    prisma.project.count({ where }),
  ]);

  if (projects.length === 0) {
    return {
      displayProjects: [],
      projects: totalProjects,
      filteredProjects,
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
      images,
      isFeatured: project.isFeatured,
      publishedAt: project.publishedAt,
    };
  });

  return {
    displayProjects,
    projects: totalProjects,
    filteredProjects,
  };
}
