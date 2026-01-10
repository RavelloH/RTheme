import prisma from "@/lib/server/prisma";
import { notFound } from "next/navigation";
import { TextVersion } from "text-version";
import { getFeaturedImageUrl } from "@/lib/server/media-reference";

export interface PostData {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isPinned: boolean;
  allowComments: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  featuredImage: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  robotsIndex: boolean;
  postMode: "MARKDOWN" | "MDX";
  author: {
    uid: number;
    username: string;
    nickname: string | null;
  };
  categories: Array<{
    id: number;
    name: string;
  }>;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  _count: {
    comments: number;
  };
  viewCount: number;
}

export interface RenderedContent {
  content: string;
  mode: "markdown" | "mdx";
}

/**
 * 获取公开的文章数据
 * 只返回已发布且未被删除的文章
 */
export async function getPublishedPost(slug: string): Promise<PostData> {
  const post = await prisma.post.findUnique({
    where: {
      slug,
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
    notFound();
  }

  // 提取特色图片URL
  const featuredImage = getFeaturedImageUrl(post.mediaRefs);

  return {
    ...post,
    viewCount: post.viewCount?.cachedCount || 0,
    featuredImage,
  } as PostData;
}

/**
 * 渲染文章内容
 */
export async function renderPostContent(
  post: PostData,
): Promise<RenderedContent> {
  // text-version 获取最新版本的内容
  const tv = new TextVersion();
  const latestContent = tv.latest(post.content);

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
  // 首先获取当前文章的发布时间
  const currentPost = await prisma.post.findUnique({
    where: { slug: currentSlug },
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
}
