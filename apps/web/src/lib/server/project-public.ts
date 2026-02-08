import "server-only";

import { notFound } from "next/navigation";

import { batchQueryMediaFiles } from "@/lib/server/image-query";
import { getAllFeaturedImageUrls } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import {
  extractInternalHashes,
  type MediaFileInfo,
  type ProcessedImageData,
  processImageUrl,
} from "@/lib/shared/image-utils";
import { MEDIA_SLOTS } from "@/types/media";

import type { Prisma } from ".prisma/client";

function normalizeDescription(description: string): string {
  const compact = description.replace(/\s+/g, " ").trim();
  return compact || "暂无项目描述。";
}

function normalizeLanguages(languages: Prisma.JsonValue): string[] {
  if (!languages) return [];

  if (Array.isArray(languages)) {
    return languages.filter((item): item is string => typeof item === "string");
  }

  if (typeof languages !== "object") {
    return [];
  }

  const languageEntries = Object.entries(languages as Record<string, unknown>)
    .map(([name, score]) => ({
      name,
      score: typeof score === "number" ? score : 0,
    }))
    .sort((a, b) => b.score - a.score);

  return languageEntries.map((entry) => entry.name);
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

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "string") continue;
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    links.add(trimmed);
  }

  return Array.from(links);
}

export interface PublicProjectSeoData {
  title: string;
  slug: string;
  description: string;
  metaDescription: string | null;
  metaKeywords: string | null;
  robotsIndex: boolean;
}

export interface PublicProjectDetail {
  id: number;
  title: string;
  slug: string;
  description: string;
  content: string;
  stars: number;
  forks: number;
  languages: string[];
  license: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
  links: string[];
  techStack: string[];
  isFeatured: boolean;
  metaDescription: string | null;
  metaKeywords: string | null;
  robotsIndex: boolean;
  author: {
    uid: number;
    username: string;
    nickname: string | null;
  };
  categories: Array<{
    name: string;
    fullSlug: string;
  }>;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  coverImages: ProcessedImageData[];
}

export async function getPublishedProjectStaticParams(): Promise<
  Array<{ slug: string }>
> {
  const projects = await prisma.project.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      slug: true,
    },
  });

  return projects.map((project) => ({ slug: project.slug }));
}

export async function getPublishedProjectSeo(
  slug: string,
): Promise<PublicProjectSeoData | null> {
  const project = await prisma.project.findUnique({
    where: {
      slug,
      status: "PUBLISHED",
    },
    select: {
      title: true,
      slug: true,
      description: true,
      metaDescription: true,
      metaKeywords: true,
      robotsIndex: true,
    },
  });

  if (!project) {
    return null;
  }

  return {
    title: project.title,
    slug: project.slug,
    description: normalizeDescription(project.description),
    metaDescription: project.metaDescription,
    metaKeywords: project.metaKeywords,
    robotsIndex: project.robotsIndex,
  };
}

export async function getPublishedProjectDetail(slug: string): Promise<{
  project: PublicProjectDetail;
  mediaFileMap: Map<string, MediaFileInfo>;
}> {
  const project = await prisma.project.findUnique({
    where: {
      slug,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      content: true,
      stars: true,
      forks: true,
      languages: true,
      license: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      demoUrl: true,
      repoUrl: true,
      urls: true,
      techStack: true,
      isFeatured: true,
      metaDescription: true,
      metaKeywords: true,
      robotsIndex: true,
      author: {
        select: {
          uid: true,
          username: true,
          nickname: true,
        },
      },
      categories: {
        select: {
          name: true,
          fullSlug: true,
        },
      },
      tags: {
        select: {
          name: true,
          slug: true,
        },
      },
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
  });

  if (!project) {
    notFound();
  }

  const featuredImageUrls = getAllFeaturedImageUrls(project.mediaRefs);
  const allImageUrls = new Set<string>(featuredImageUrls);

  const contentHashes = extractInternalHashes(project.content || "");
  for (const hash of contentHashes) {
    allImageUrls.add(`/p/${hash.fullHash}`);
  }

  const mediaFileMap = await batchQueryMediaFiles(Array.from(allImageUrls));
  const coverImages =
    featuredImageUrls.length > 0
      ? processImageUrl(featuredImageUrls.join(","), mediaFileMap)
      : [];

  return {
    project: {
      id: project.id,
      title: project.title,
      slug: project.slug,
      description: normalizeDescription(project.description),
      content: project.content || "",
      stars: project.stars,
      forks: project.forks,
      languages: normalizeLanguages(project.languages),
      license: project.license,
      startedAt: project.startedAt,
      completedAt: project.completedAt,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      publishedAt: project.publishedAt,
      links: normalizeLinks({
        demoUrl: project.demoUrl,
        repoUrl: project.repoUrl,
        urls: project.urls,
      }),
      techStack: project.techStack,
      isFeatured: project.isFeatured,
      metaDescription: project.metaDescription,
      metaKeywords: project.metaKeywords,
      robotsIndex: project.robotsIndex,
      author: {
        uid: project.author.uid,
        username: project.author.username,
        nickname: project.author.nickname,
      },
      categories: project.categories.map((category) => ({
        name: category.name,
        fullSlug: category.fullSlug,
      })),
      tags: project.tags.map((tag) => ({
        name: tag.name,
        slug: tag.slug,
      })),
      coverImages,
    },
    mediaFileMap,
  };
}
