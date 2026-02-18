import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

import { getFeaturedImageUrl } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import { analyzeText } from "@/lib/server/tokenizer";
import { MEDIA_SLOTS } from "@/types/media";

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

export interface RecommendedPostData {
  title: string;
  slug: string;
  excerpt: string | null;
  publishedAt: Date | null;
  featuredImage?: string | null;
  categories: Array<{
    name: string;
    slug: string;
  }>;
  tags: Array<{
    name: string;
    slug: string;
  }>;
  recommendationScore: number;
  matchedKeywords: string[];
}

interface RecommendationTokenStat {
  token: string;
  count: number;
}

const RECOMMENDATION_DEFAULT_LIMIT = 6;
const RECOMMENDATION_DEFAULT_CANDIDATE_LIMIT = 80;
const RECOMMENDATION_SOURCE_CONTENT_LIMIT = 8000;
const RECOMMENDATION_TARGET_CONTENT_LIMIT = 2400;
const RECOMMENDATION_TOKEN_LIMIT = 20;

function isValidRecommendationToken(token: string): boolean {
  if (token.length < 2 || token.length > 40) {
    return false;
  }

  if (/^\d+$/.test(token)) {
    return false;
  }

  return /[a-zA-Z0-9\u4e00-\u9fff]/.test(token);
}

function getTopFrequentTokens(
  tokens: string[],
  limit: number,
): RecommendationTokenStat[] {
  const frequency = new Map<string, number>();

  for (const token of tokens) {
    const normalized = token.trim().toLowerCase();
    if (!isValidRecommendationToken(normalized)) {
      continue;
    }

    frequency.set(normalized, (frequency.get(normalized) || 0) + 1);
  }

  return Array.from(frequency.entries())
    .map(([token, count]) => ({ token, count }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.token.length - a.token.length;
    })
    .slice(0, limit);
}

function toSafePositiveInt(
  value: number,
  fallback: number,
  max: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const integer = Math.trunc(value);
  if (integer <= 0) {
    return fallback;
  }

  return Math.min(integer, max);
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

/**
 * 获取推荐文章
 * 推荐维度：分类、标签、高频分词
 */
export async function getRecommendedPosts(
  currentPost: FullPostData,
  options?: {
    limit?: number;
    candidateLimit?: number;
  },
): Promise<RecommendedPostData[]> {
  const limit = toSafePositiveInt(
    options?.limit ?? RECOMMENDATION_DEFAULT_LIMIT,
    RECOMMENDATION_DEFAULT_LIMIT,
    12,
  );
  const candidateLimit = toSafePositiveInt(
    options?.candidateLimit ?? RECOMMENDATION_DEFAULT_CANDIDATE_LIMIT,
    RECOMMENDATION_DEFAULT_CANDIDATE_LIMIT,
    200,
  );

  const getCachedData = unstable_cache(
    async (): Promise<RecommendedPostData[]> => {
      const currentCategoryIds = new Set(
        currentPost.categories.map((c) => c.id),
      );
      const currentTagSlugs = new Set(currentPost.tags.map((t) => t.slug));

      const recommendationSource = [
        currentPost.title,
        currentPost.excerpt || "",
        currentPost.metaKeywords || "",
        currentPost.categories.map((c) => c.name).join(" "),
        currentPost.tags.map((t) => t.name).join(" "),
        currentPost.content.slice(0, RECOMMENDATION_SOURCE_CONTENT_LIMIT),
      ]
        .filter(Boolean)
        .join("\n");

      const sourceTokens = await analyzeText(recommendationSource);
      const topTokenStats = getTopFrequentTokens(
        sourceTokens,
        RECOMMENDATION_TOKEN_LIMIT,
      );

      const postSelect = {
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        createdAt: true,
        metaKeywords: true,
        plain: true,
        mediaRefs: {
          where: {
            slot: MEDIA_SLOTS.POST_FEATURED_IMAGE,
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
        categories: {
          select: {
            id: true,
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
      };

      const baseWhere = {
        status: "PUBLISHED" as const,
        deletedAt: null,
        slug: { not: currentPost.slug },
      };

      const relationWhereClauses: Array<Record<string, unknown>> = [];
      if (currentCategoryIds.size > 0) {
        relationWhereClauses.push({
          categories: {
            some: {
              id: {
                in: Array.from(currentCategoryIds),
              },
            },
          },
        });
      }
      if (currentTagSlugs.size > 0) {
        relationWhereClauses.push({
          tags: {
            some: {
              slug: {
                in: Array.from(currentTagSlugs),
              },
            },
          },
        });
      }

      const [relationCandidates, recentCandidates] = await Promise.all([
        relationWhereClauses.length > 0
          ? prisma.post.findMany({
              where: {
                ...baseWhere,
                OR: relationWhereClauses,
              },
              select: postSelect,
              orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
              take: candidateLimit,
            })
          : Promise.resolve([]),
        prisma.post.findMany({
          where: baseWhere,
          select: postSelect,
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: candidateLimit,
        }),
      ]);

      const candidatesMap = new Map<
        string,
        (typeof recentCandidates)[number]
      >();
      for (const post of relationCandidates) {
        candidatesMap.set(post.slug, post);
      }
      for (const post of recentCandidates) {
        if (!candidatesMap.has(post.slug)) {
          candidatesMap.set(post.slug, post);
        }
      }

      const scoredPosts = Array.from(candidatesMap.values()).map(
        (candidate) => {
          const matchedCategoryCount = candidate.categories.reduce(
            (count, cat) => {
              return count + (currentCategoryIds.has(cat.id) ? 1 : 0);
            },
            0,
          );
          const matchedTagCount = candidate.tags.reduce((count, tag) => {
            return count + (currentTagSlugs.has(tag.slug) ? 1 : 0);
          }, 0);

          const targetText = [
            candidate.title,
            candidate.excerpt || "",
            candidate.metaKeywords || "",
            candidate.plain?.slice(0, RECOMMENDATION_TARGET_CONTENT_LIMIT) ||
              "",
            candidate.categories.map((category) => category.name).join(" "),
            candidate.tags.map((tag) => tag.name).join(" "),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const matchedKeywords: string[] = [];
          let tokenScore = 0;
          for (const tokenStat of topTokenStats) {
            if (targetText.includes(tokenStat.token)) {
              matchedKeywords.push(tokenStat.token);
              tokenScore += Math.min(tokenStat.count, 4);
            }
          }

          const recommendationScore =
            matchedCategoryCount * 12 + matchedTagCount * 8 + tokenScore;

          return {
            ...candidate,
            recommendationScore,
            matchedKeywords,
          };
        },
      );

      scoredPosts.sort((a, b) => {
        if (b.recommendationScore !== a.recommendationScore) {
          return b.recommendationScore - a.recommendationScore;
        }

        const bPublished = b.publishedAt?.getTime() || 0;
        const aPublished = a.publishedAt?.getTime() || 0;
        return bPublished - aPublished;
      });

      const relevant = scoredPosts.filter(
        (post) => post.recommendationScore > 0,
      );
      const fallback = scoredPosts.filter(
        (post) => post.recommendationScore <= 0,
      );
      const selected = [...relevant, ...fallback].slice(0, limit);

      return selected.map((post) => ({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        publishedAt: post.publishedAt,
        featuredImage: getFeaturedImageUrl(post.mediaRefs),
        categories: post.categories.map((category) => ({
          name: category.name,
          slug: category.slug,
        })),
        tags: post.tags,
        recommendationScore: post.recommendationScore,
        matchedKeywords: post.matchedKeywords.slice(0, 5),
      }));
    },
    [`recommended-posts-${currentPost.slug}-${limit}-${candidateLimit}`],
    {
      tags: ["posts/list", `posts/${currentPost.slug}`],
      revalidate: false,
    },
  );

  return getCachedData();
}
