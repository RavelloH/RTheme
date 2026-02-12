import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

import { getFeaturedImageUrl } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";

export interface PostData {
  id?: number;
  title: string;
  slug: string;
  content?: string;
  excerpt: string | null;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPinned: boolean;
  allowComments?: boolean;
  publishedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  featuredImage?: string | null;
  license?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  robotsIndex?: boolean;
  postMode?: "MARKDOWN" | "MDX";
  // 为搜索结果添加的额外属性
  summary?: string; // PostCard 需要的摘要属性
  cover?:
    | Array<{
        url: string;
        width?: number;
        height?: number;
        blur?: string;
      }>
    | string; // PostCard 需要的封面属性
  author?: {
    uid: number;
    username: string;
    nickname: string | null;
  };
  categories?: Array<{
    id?: number;
    name: string;
    slug?: string;
  }>;
  tags?: Array<{
    name: string;
    slug: string;
  }>;
  _count?: {
    comments: number;
  };
  viewCount?: number;
}

export type FullPostData = Omit<PostData, "categories" | "tags" | "author"> & {
  id: number;
  content: string;
  allowComments: boolean;
  author: NonNullable<PostData["author"]>;
  categories: Array<{
    id: number;
    name: string;
    slug?: string;
  }>;
  tags: NonNullable<PostData["tags"]>;
  createdAt: Date;
  updatedAt: Date;
};

export interface RenderedContent {
  content: string;
  mode: "markdown" | "mdx";
}

/**
 * 获取公开的文章数据
 * 只返回已发布且未被删除的文章
 */
export async function getPublishedPost(slug: string): Promise<FullPostData> {
  const getCachedData = unstable_cache(
    async (s: string) => {
      const post = await prisma.post.findUnique({
        where: {
          slug: s,
          status: "PUBLISHED",
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          content: true,
          excerpt: true,
          status: true,
          isPinned: true,
          allowComments: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          metaDescription: true,
          metaKeywords: true,
          robotsIndex: true,
          postMode: true,
          license: true,
          author: {
            select: {
              uid: true,
              username: true,
              nickname: true,
            },
          },
          categories: {
            select: {
              id: true,
              name: true,
            },
          },
          tags: {
            select: {
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              comments: {
                where: {
                  status: "APPROVED",
                  deletedAt: null,
                },
              },
            },
          },
          viewCount: {
            select: {
              cachedCount: true,
            },
          },
          mediaRefs: {
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

      if (!post) {
        return null;
      }

      // 提取特色图片URL
      const featuredImage = getFeaturedImageUrl(post.mediaRefs);

      return {
        ...post,
        viewCount: post.viewCount?.cachedCount || 0,
        featuredImage,
      } as FullPostData;
    },
    [`published-post-${slug}`],
    {
      tags: ["posts/list"],
      revalidate: false,
    },
  );

  const result = await getCachedData(slug);

  if (!result) {
    notFound();
  }

  return result;
}

/**
 * 渲染文章内容
 */
export async function renderPostContent(
  post: PostData,
): Promise<RenderedContent> {
  // text-version v2: 直接使用 content 字段（已经是最新内容）
  const latestContent = post.content || "";

  if (post.postMode === "MARKDOWN") {
    // Markdown 模式：直接返回原始内容，由 react-markdown 在组件中渲染
    return { content: latestContent, mode: "markdown" };
  } else if (post.postMode === "MDX") {
    // MDX 模式：直接返回原始内容，由 MDXRemote 在组件中编译和渲染
    // MDXRemote (RSC) 会自己处理编译，不需要提前 serialize
    return { content: latestContent, mode: "mdx" };
  } else {
    throw new Error(`Unsupported post mode: ${post.postMode}`);
  }
}

export interface AdjacentPostData {
  title: string;
  slug: string;
  publishedAt: Date | null;
  categories: Array<{
    name: string;
    slug: string;
  }>;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  excerpt: string | null;
  isPinned: boolean;
  mediaRefs: Array<{
    slot: string;
    media: { shortHash: string };
  }>;
}

export interface AdjacentPosts {
  previous: AdjacentPostData | null;
  next: AdjacentPostData | null;
}

/**
 * 获取相邻的文章（上一篇和下一篇）
 * 基于发布时间排序
 */
export async function getAdjacentPosts(
  currentSlug: string,
): Promise<AdjacentPosts> {
  const getCachedData = unstable_cache(
    async (slug: string) => {
      // 首先获取当前文章的发布时间
      const currentPost = await prisma.post.findUnique({
        where: { slug },
        select: { publishedAt: true },
      });

      if (!currentPost?.publishedAt) {
        return { previous: null, next: null };
      }

      const baseWhere = {
        status: "PUBLISHED" as const,
        deletedAt: null,
        publishedAt: { not: null },
      };

      // 获取上一篇文章（发布时间早于当前文章的最新一篇）
      const previousPost = await prisma.post.findFirst({
        where: {
          ...baseWhere,
          publishedAt: { lt: currentPost.publishedAt },
        },
        orderBy: { publishedAt: "desc" },
        select: {
          title: true,
          slug: true,
          publishedAt: true,
          excerpt: true,
          isPinned: true,
          categories: {
            select: {
              name: true,
              slug: true,
            },
          },
          tags: {
            select: {
              name: true,
              slug: true,
            },
          },
          mediaRefs: {
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

      // 获取下一篇文章（发布时间晚于当前文章的最早一篇）
      const nextPost = await prisma.post.findFirst({
        where: {
          ...baseWhere,
          publishedAt: { gt: currentPost.publishedAt },
        },
        orderBy: { publishedAt: "asc" },
        select: {
          title: true,
          slug: true,
          publishedAt: true,
          excerpt: true,
          isPinned: true,
          categories: {
            select: {
              name: true,
              slug: true,
            },
          },
          tags: {
            select: {
              name: true,
              slug: true,
            },
          },
          mediaRefs: {
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

      return {
        previous: previousPost,
        next: nextPost,
      };
    },
    [`adjacent-posts-${currentSlug}`],
    {
      tags: ["posts/list"],
      revalidate: false,
    },
  );

  const cachedAdjacentPosts = await getCachedData(currentSlug);

  const normalizeAdjacentPost = (
    post: AdjacentPostData | null,
  ): AdjacentPostData | null => {
    if (!post) {
      return null;
    }

    return {
      ...post,
      publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
    };
  };

  return {
    previous: normalizeAdjacentPost(cachedAdjacentPosts.previous),
    next: normalizeAdjacentPost(cachedAdjacentPosts.next),
  };
}
