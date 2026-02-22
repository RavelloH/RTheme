import "server-only";

import prisma from "@/lib/server/prisma";

const BASE_CACHE_TAGS = [
  "config",
  "menus",
  "pages",
  "posts",
  "posts/list",
  "projects",
  "projects/list",
  "tags",
  "tags/list",
  "categories",
  "categories/list",
  "users",
  "friend-links",
  "gallery/list",
  "custom-dictionary",
] as const;

const PUBLIC_PROJECT_STATUSES = [
  "PUBLISHED",
  "DEVELOPING",
  "ARCHIVED",
] as const;

export type RevalidatePathTarget = {
  path: string;
  type: "page" | "layout";
};

const CRITICAL_REVALIDATE_PATH_TARGETS: RevalidatePathTarget[] = [
  { path: "/", type: "layout" },
  { path: "/posts", type: "layout" },
  { path: "/projects", type: "layout" },
  { path: "/gallery", type: "layout" },
  { path: "/admin", type: "layout" },
  { path: "/", type: "page" },
  { path: "/posts", type: "page" },
  { path: "/projects", type: "page" },
  { path: "/gallery", type: "page" },
  { path: "/tags", type: "page" },
  { path: "/categories", type: "page" },
  { path: "/posts/[slug]", type: "page" },
  { path: "/projects/[slug]", type: "page" },
  { path: "/gallery/photo/[slug]", type: "page" },
  { path: "/user/[uid]", type: "page" },
  { path: "/[[...slug]]", type: "page" },
];

export function getCriticalRevalidatePathTargets(): RevalidatePathTarget[] {
  const dedup = new Set<string>();
  const results: RevalidatePathTarget[] = [];

  for (const target of CRITICAL_REVALIDATE_PATH_TARGETS) {
    const dedupKey = `${target.type}:${target.path}`;
    if (dedup.has(dedupKey)) continue;
    dedup.add(dedupKey);
    results.push(target);
  }

  return results;
}

export async function collectBootstrapTags(): Promise<string[]> {
  const [
    configKeys,
    pages,
    publishedPosts,
    publishedProjects,
    tags,
    categories,
    users,
    photos,
  ] = await Promise.all([
    prisma.config.findMany({
      select: { key: true },
    }),
    prisma.page.findMany({
      where: { deletedAt: null },
      select: { id: true },
    }),
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
      },
      select: {
        slug: true,
        userUid: true,
      },
    }),
    prisma.project.findMany({
      where: {
        deletedAt: null,
        status: {
          in: [...PUBLIC_PROJECT_STATUSES],
        },
      },
      select: {
        slug: true,
        userUid: true,
      },
    }),
    prisma.tag.findMany({
      select: { slug: true },
    }),
    prisma.category.findMany({
      select: { fullSlug: true },
    }),
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { uid: true },
    }),
    prisma.photo.findMany({
      select: { slug: true },
    }),
  ]);

  const tagSet = new Set<string>(BASE_CACHE_TAGS);

  for (const item of configKeys) {
    const key = item.key.trim();
    if (!key) continue;
    tagSet.add(`config/${key}`);
  }

  for (const page of pages) {
    tagSet.add(`pages/${page.id}`);
  }

  for (const post of publishedPosts) {
    if (post.slug.trim().length > 0) {
      tagSet.add(`posts/${post.slug}`);
    }
    tagSet.add(`users/${post.userUid}`);
  }

  for (const project of publishedProjects) {
    if (project.slug.trim().length > 0) {
      tagSet.add(`projects/${project.slug}`);
    }
    tagSet.add(`users/${project.userUid}`);
  }

  for (const tag of tags) {
    const slug = tag.slug.trim();
    if (!slug) continue;
    tagSet.add(`tags/${slug}`);
  }

  for (const category of categories) {
    const fullSlug = category.fullSlug.trim();
    if (!fullSlug) continue;
    tagSet.add(`categories/${fullSlug}`);
  }

  for (const user of users) {
    tagSet.add(`users/${user.uid}`);
  }

  for (const photo of photos) {
    const slug = photo.slug.trim();
    if (!slug) continue;
    tagSet.add(`photos/${slug}`);
  }

  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}
