"use server";
import type {
  ApiResponse,
  ApiResponseData,
} from "@repo/shared-types/api/common";
import type {
  AddCustomWord,
  AddCustomWordResult,
  CustomWordItem,
  DeleteCustomWord,
  DeleteCustomWordResult,
  DeleteIndex,
  DeleteIndexResult,
  GetCustomWords,
  GetIndexStatus,
  GetPostTokenDetails,
  GetSearchIndexStats,
  GetSearchLogs,
  GetSearchLogStats,
  IndexPosts,
  IndexPostsResult,
  IndexStatusItem,
  PostStatus,
  PostTokenDetails,
  SearchIndexStatsResult,
  SearchLogDailyTrend,
  SearchLogItem,
  SearchLogStatsResult,
  SearchPosts,
  SearchPostsResult,
  SearchPostsResultItem,
  TestTokenize,
  TestTokenizeResult,
} from "@repo/shared-types/api/search";
import {
  AddCustomWordSchema,
  DeleteCustomWordSchema,
  DeleteIndexSchema,
  GetIndexStatusSchema,
  GetPostTokenDetailsSchema,
  GetSearchLogsSchema,
  GetSearchLogStatsSchema,
  IndexPostsSchema,
  SearchPostsSchema,
  TestTokenizeSchema,
} from "@repo/shared-types/api/search";
import { updateTag } from "next/cache";
import { headers } from "next/headers";
import type { NextResponse } from "next/server";
import { z } from "zod";

import { logAuditEvent } from "@/lib/server/audit";
import { authVerify } from "@/lib/server/auth-verify";
import { generateCacheKey } from "@/lib/server/cache";
import { getClientIP } from "@/lib/server/get-client-info";
import { generateSignature } from "@/lib/server/image-crypto";
import { resolveIpLocation } from "@/lib/server/ip-utils";
import prisma from "@/lib/server/prisma";
import limitControl from "@/lib/server/rate-limit";
import ResponseBuilder from "@/lib/server/response";
import {
  generateSmartExcerpt,
  getLocalDateString,
  highlightTitle,
  markdownToPlainText,
} from "@/lib/server/search";
import { analyzeText } from "@/lib/server/tokenizer";
import { validateData } from "@/lib/server/validator";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

const SearchSiteSchema = z.object({
  query: z.string().trim().min(1).max(200),
  sessionId: z.string().max(100).optional(),
  visitorId: z.string().max(100).optional(),
});

export type SearchSiteParams = z.infer<typeof SearchSiteSchema>;

export interface SearchSitePostItem {
  slug: string;
  title: string;
  excerpt: string | null;
  titleHighlight?: string;
  excerptHighlight?: string | null;
}

export interface SearchSiteProjectItem {
  id: number;
  slug: string;
  title: string;
  description: string;
}

export interface SearchSiteTagItem {
  slug: string;
  name: string;
  description: string | null;
}

export interface SearchSiteCategoryItem {
  id: number;
  slug: string;
  name: string;
  fullSlug: string;
  description: string | null;
}

export interface SearchSitePhotoItem {
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string;
}

export interface SearchSiteResult {
  query: string;
  posts: SearchSitePostItem[];
  projects: SearchSiteProjectItem[];
  tags: SearchSiteTagItem[];
  categories: SearchSiteCategoryItem[];
  photos: SearchSitePhotoItem[];
  counts: {
    posts: number;
    projects: number;
    tags: number;
    categories: number;
    photos: number;
    total: number;
  };
}

function createEmptySearchSiteResult(query: string): SearchSiteResult {
  return {
    query,
    posts: [],
    projects: [],
    tags: [],
    categories: [],
    photos: [],
    counts: {
      posts: 0,
      projects: 0,
      tags: 0,
      categories: 0,
      photos: 0,
      total: 0,
    },
  };
}

/**
 * 辅助函数：解析文章内容并提取纯文本
 * text-version v2: content 字段已经是最新内容
 */
async function extractTextFromContent(content: string): Promise<string> {
  // 第二步：将 Markdown/MDX 转换为纯文本
  return await markdownToPlainText(content);
}

export async function testTokenize(
  params: Omit<TestTokenize, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<TestTokenizeResult | null>>>;
export async function testTokenize(
  params: Omit<TestTokenize, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<TestTokenizeResult | null>>;
export async function testTokenize(
  { text }: Omit<TestTokenize, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<TestTokenizeResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "testTokenize"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      text,
    },
    TestTokenizeSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以使用
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 执行分词并记录时间
    const startTime = performance.now();
    const tokens = await analyzeText(text);
    const endTime = performance.now();
    const duration = Math.round((endTime - startTime) * 1000); // 转换为微秒

    return response.ok({
      data: {
        text,
        tokens,
        count: tokens.length,
        duration,
      },
    });
  } catch (error) {
    console.error("分词测试失败:", error);
    return response.serverError({ message: "分词测试失败" });
  }
}

/*
  addCustomWord - 添加自定义词典
*/
export async function addCustomWord(
  params: Omit<AddCustomWord, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<AddCustomWordResult | null>>>;
export async function addCustomWord(
  params: Omit<AddCustomWord, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<AddCustomWordResult | null>>;
export async function addCustomWord(
  { word }: Omit<AddCustomWord, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<AddCustomWordResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "addCustomWord"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      word,
    },
    AddCustomWordSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 检查词汇是否包含空格
  if (word.includes(" ")) {
    return response.badRequest({ message: "自定义词汇中不能含有空格" });
  }

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员可以添加
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 检查词汇是否已存在
    const existing = await prisma.customDictionary.findUnique({
      where: { word },
    });

    if (existing) {
      return response.conflict({ message: "该词汇已存在于自定义词典中" });
    }

    // 在添加到数据库之前，先搜索可能受影响的文章
    // 对词汇进行分词，找出当前分词结果中包含这些子词的文章
    const tokens = await analyzeText(word);

    // 转义 token 以便安全地用于 PostgreSQL tsquery
    const escapeTsqueryToken = (token: string): string => {
      // 转义反斜杠和双引号，然后用双引号包裹
      const escaped = token.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `"${escaped}"`;
    };

    // 转义所有 tokens
    const escapedTokens = tokens.map(escapeTsqueryToken);

    let affectedPosts: Array<{ slug: string; title: string }> = [];

    // 只有在存在 token 时才进行搜索
    if (tokens.length > 0) {
      // 构建搜索查询：使用 OR 连接所有子词
      const searchQuery = escapedTokens.join(" | ");

      affectedPosts = await prisma.$queryRawUnsafe<
        Array<{ slug: string; title: string }>
      >(
        `
        SELECT DISTINCT slug, title
        FROM "Post"
        WHERE
          "titleSearchVector" @@ to_tsquery('simple', $1)
          OR "contentSearchVector" @@ to_tsquery('simple', $1)
        ORDER BY slug
        LIMIT 100
      `,
        searchQuery,
      );
    }

    // 添加到数据库
    await prisma.customDictionary.create({
      data: { word },
    });

    // 清除词典缓存，强制重新加载
    updateTag("custom-dictionary");

    // 记录审计日志
    const { after } = await import("next/server");
    after(async () => {
      await logAuditEvent({
        user: {
          uid: String(user.uid),
        },
        details: {
          action: "ADD_CUSTOM_WORD",
          resourceType: "SEARCH",
          value: {
            old: null,
            new: word,
          },
          description: `添加自定义词典：${word}`,
        },
      });
    });

    return response.ok({
      data: {
        word,
        added: true,
        affectedPosts: affectedPosts.length > 0 ? affectedPosts : undefined,
      },
    });
  } catch (error) {
    console.error("添加自定义词典失败:", error);
    return response.serverError({ message: "添加自定义词典失败" });
  }
}

/*
  getCustomWords - 获取自定义词典列表
*/
export async function getCustomWords(
  params: Omit<GetCustomWords, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CustomWordItem[] | null>>>;
export async function getCustomWords(
  params: Omit<GetCustomWords, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CustomWordItem[] | null>>;
export async function getCustomWords(
  _params: Omit<GetCustomWords, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CustomWordItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getCustomWords"))) {
    return response.tooManyRequests();
  }

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以查看
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const words = await prisma.customDictionary.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        word: true,
        createdAt: true,
      },
    });

    return response.ok({
      data: words.map((w) => ({
        id: w.id,
        word: w.word,
        createdAt: w.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("获取自定义词典失败:", error);
    return response.serverError({ message: "获取自定义词典失败" });
  }
}

/*
  deleteCustomWord - 删除自定义词典
*/
export async function deleteCustomWord(
  params: Omit<DeleteCustomWord, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DeleteCustomWordResult | null>>>;
export async function deleteCustomWord(
  params: Omit<DeleteCustomWord, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DeleteCustomWordResult | null>>;
export async function deleteCustomWord(
  { id }: Omit<DeleteCustomWord, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DeleteCustomWordResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "deleteCustomWord"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      id,
    },
    DeleteCustomWordSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员可以删除
  const user = await authVerify({
    allowedRoles: ["ADMIN"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 获取词汇信息
    const wordData = await prisma.customDictionary.findUnique({
      where: { id },
    });

    if (!wordData) {
      return response.notFound({ message: "词汇不存在" });
    }

    // 在删除之前，先搜索包含该词汇的文章
    // 搜索现有索引中包含该完整词汇的文章
    // 转义 token 以便安全地用于 PostgreSQL tsquery
    const escapeTsqueryToken = (token: string): string => {
      // 转义反斜杠和双引号，然后用双引号包裹
      const escaped = token.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `"${escaped}"`;
    };

    const escapedWord = escapeTsqueryToken(wordData.word);

    const affectedPosts = await prisma.$queryRawUnsafe<
      Array<{ slug: string; title: string }>
    >(
      `
      SELECT DISTINCT slug, title
      FROM "Post"
      WHERE
        "titleSearchVector" @@ to_tsquery('simple', $1)
        OR "contentSearchVector" @@ to_tsquery('simple', $1)
      ORDER BY slug
      LIMIT 100
    `,
      escapedWord,
    );

    // 删除词汇
    await prisma.customDictionary.delete({
      where: { id },
    });

    // 清除词典缓存，强制重新加载
    updateTag("custom-dictionary");

    // 记录审计日志
    const { after } = await import("next/server");
    after(async () => {
      await logAuditEvent({
        user: {
          uid: String(user.uid),
        },
        details: {
          action: "DELETE_CUSTOM_WORD",
          resourceType: "SEARCH",
          resourceId: String(id),
          value: {
            old: wordData.word,
            new: null,
          },
          description: `删除自定义词典：${wordData.word}`,
        },
      });
    });

    return response.ok({
      data: {
        id,
        word: wordData.word,
        deleted: true,
        affectedPosts: affectedPosts.length > 0 ? affectedPosts : undefined,
      },
    });
  } catch (error) {
    console.error("删除自定义词典失败:", error);
    return response.serverError({ message: "删除自定义词典失败" });
  }
}

/*
  indexPosts - 创建/更新文章索引
*/
export async function indexPosts(
  params: Omit<IndexPosts, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<IndexPostsResult | null>>>;
export async function indexPosts(
  params: Omit<IndexPosts, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<IndexPostsResult | null>>;
export async function indexPosts(
  { slugs }: Omit<IndexPosts, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<IndexPostsResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "indexPosts"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      slugs,
    },
    IndexPostsSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以操作
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 构建查询条件
    const whereCondition =
      slugs && slugs.length > 0 ? { slug: { in: slugs } } : {};

    // 获取需要索引的文章
    const posts = await prisma.post.findMany({
      where: whereCondition,
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        postMode: true,
      },
    });

    if (posts.length === 0) {
      return response.notFound({ message: "未找到需要索引的文章" });
    }

    let indexed = 0;
    let failed = 0;
    const errors: Array<{ slug: string; error: string }> = [];

    // 逐个处理文章索引
    for (const post of posts) {
      try {
        // 1. 提取标题分词
        const titleTokens = await analyzeText(post.title);

        // 2. 根据 postMode 提取内容纯文本
        const plainText = await extractTextFromContent(post.content);

        // 3. 提取内容分词
        const contentTokens = await analyzeText(plainText);

        // 4. 将分词结果用空格连接成字符串
        const titleTokensStr = titleTokens.join(" ");
        const contentTokensStr = contentTokens.join(" ");

        // 5. 使用 PostgreSQL 的 to_tsvector() 函数创建全文搜索索引
        // 使用 'simple' 配置，因为我们已经通过自定义分词器完成了分词
        await prisma.$executeRaw`
          UPDATE "Post"
          SET
            "titleSearchVector" = to_tsvector('simple', ${titleTokensStr}),
            "contentSearchVector" = to_tsvector('simple', ${contentTokensStr}),
            "plain" = ${plainText},
            "tokenizedAt" = NOW()
          WHERE "id" = ${post.id}
        `;

        indexed++;
      } catch (error) {
        console.error(`索引文章 ${post.slug} 失败:`, error);
        failed++;
        errors.push({
          slug: post.slug,
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    }

    // 记录审计日志
    const { after } = await import("next/server");
    after(async () => {
      await logAuditEvent({
        user: {
          uid: String(user.uid),
        },
        details: {
          action: "INDEX_POSTS",
          resourceType: "SEARCH",
          resourceId: slugs?.join(","),
          value: {
            old: null,
            new: {
              total: posts.length,
              indexed,
              failed,
            },
          },
          description: `创建文章索引：${indexed} 成功，${failed} 失败，共 ${posts.length} 篇`,
        },
      });
    });

    return response.ok({
      data: {
        total: posts.length,
        indexed,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("创建文章索引失败:", error);
    return response.serverError({ message: "创建文章索引失败" });
  }
}

/*
  deleteIndex - 删除文章索引
*/
export async function deleteIndex(
  params: Omit<DeleteIndex, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<DeleteIndexResult | null>>>;
export async function deleteIndex(
  params: Omit<DeleteIndex, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<DeleteIndexResult | null>>;
export async function deleteIndex(
  { slugs }: Omit<DeleteIndex, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<DeleteIndexResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "deleteIndex"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      slugs,
    },
    DeleteIndexSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以操作
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 获取需要删除索引的文章
    const posts = await prisma.post.findMany({
      where: { slug: { in: slugs } },
      select: {
        id: true,
        slug: true,
        title: true,
      },
    });

    if (posts.length === 0) {
      return response.notFound({ message: "未找到需要删除索引的文章" });
    }

    let deleted = 0;
    let failed = 0;
    const errors: Array<{ slug: string; error: string }> = [];

    // 逐个删除文章索引
    for (const post of posts) {
      try {
        // 清空搜索向量和分词时间
        await prisma.$executeRaw`
          UPDATE "Post"
          SET
            "titleSearchVector" = NULL,
            "contentSearchVector" = NULL,
            "plain" = NULL,
            "tokenizedAt" = NULL
          WHERE "id" = ${post.id}
        `;

        deleted++;
      } catch (error) {
        console.error(`删除文章 ${post.slug} 索引失败:`, error);
        failed++;
        errors.push({
          slug: post.slug,
          error: error instanceof Error ? error.message : "未知错误",
        });
      }
    }

    // 记录审计日志
    const { after } = await import("next/server");
    after(async () => {
      await logAuditEvent({
        user: {
          uid: String(user.uid),
        },
        details: {
          action: "DELETE_INDEX",
          resourceType: "SEARCH",
          resourceId: slugs?.join(","),
          value: {
            old: {
              total: posts.length,
              deleted,
              failed,
            },
            new: null,
          },
          description: `删除文章索引：${deleted} 成功，${failed} 失败，共 ${posts.length} 篇`,
        },
      });
    });

    return response.ok({
      data: {
        total: posts.length,
        deleted,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error("删除文章索引失败:", error);
    return response.serverError({ message: "删除文章索引失败" });
  }
}

/*
  getIndexStatus - 获取文章索引状态
*/
export async function getIndexStatus(
  params: Omit<GetIndexStatus, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<IndexStatusItem[] | null>>>;
export async function getIndexStatus(
  params: Omit<GetIndexStatus, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<IndexStatusItem[] | null>>;
export async function getIndexStatus(
  {
    page = 1,
    pageSize = 25,
    sortBy = "updatedAt",
    sortOrder = "desc",
    status,
  }: Omit<GetIndexStatus, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<IndexStatusItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getIndexStatus"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      page,
      pageSize,
      sortBy,
      sortOrder,
      status,
    },
    GetIndexStatusSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以查看
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 构建查询条件
    const skip = (page - 1) * pageSize;

    // 获取文章列表基本信息
    const posts = await prisma.post.findMany({
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        updatedAt: true,
        tokenizedAt: true,
      },
    });

    // 使用原生查询获取分词信息
    const postIds = posts.map((p) => p.id);
    const tokenData = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        titleSearchVector: string | null;
        contentSearchVector: string | null;
      }>
    >(
      `SELECT id, "titleSearchVector"::text as "titleSearchVector", "contentSearchVector"::text as "contentSearchVector" FROM "Post" WHERE id = ANY($1)`,
      postIds,
    );

    // 创建 tokenData 的映射
    const tokenMap = new Map(tokenData.map((t) => [t.id, t]));

    // 计算索引状态
    const items: IndexStatusItem[] = posts.map((post) => {
      const isOutdated = post.tokenizedAt
        ? post.tokenizedAt < post.updatedAt
        : true;

      let indexStatus: "outdated" | "up-to-date" | "never-indexed";
      if (!post.tokenizedAt) {
        indexStatus = "never-indexed";
      } else if (isOutdated) {
        indexStatus = "outdated";
      } else {
        indexStatus = "up-to-date";
      }

      // 计算分词体积和词元数
      let tokenSize = 0;
      let tokenCount = 0;

      const tokens = tokenMap.get(post.id);
      if (tokens && (tokens.titleSearchVector || tokens.contentSearchVector)) {
        // PostgreSQL 的 tsvector 类型存储为字符串，计算其占用的字节数
        const titleSearchVectorStr = tokens.titleSearchVector || "";
        const contentSearchVectorStr = tokens.contentSearchVector || "";

        // 计算字节大小（UTF-8 编码）
        tokenSize =
          new Blob([titleSearchVectorStr]).size +
          new Blob([contentSearchVectorStr]).size;

        // 计算词元数（tsvector 格式为 'word':position 的形式）
        // 使用正则表达式提取词元
        const titleTokenMatches = titleSearchVectorStr.match(/'[^']+'/g) || [];
        const contentTokenMatches =
          contentSearchVectorStr.match(/'[^']+'/g) || [];
        tokenCount = titleTokenMatches.length + contentTokenMatches.length;
      }

      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        updatedAt: post.updatedAt.toISOString(),
        tokenizedAt: post.tokenizedAt?.toISOString() || null,
        status: indexStatus,
        tokenSize: tokenSize > 0 ? tokenSize : undefined,
        tokenCount: tokenCount > 0 ? tokenCount : undefined,
      };
    });

    // 根据 status 参数过滤
    const filteredItems = status
      ? items.filter((item) => item.status === status)
      : items;

    // 获取总数
    const total = await prisma.post.count();

    // 计算分页元数据
    const totalPages = Math.ceil(total / pageSize);
    const meta = {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return response.ok({
      data: filteredItems,
      meta,
    });
  } catch (error) {
    console.error("获取索引状态失败:", error);
    return response.serverError({ message: "获取索引状态失败" });
  }
}

/*
  searchPosts - 搜索文章
*/
export async function searchPosts(
  params: SearchPosts,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<SearchPostsResult | null>>>;
export async function searchPosts(
  params: SearchPosts,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<SearchPostsResult | null>>;
export async function searchPosts(
  {
    query,
    page = 1,
    pageSize = 10,
    searchIn = "both",
    status,
    sessionId,
    visitorId,
  }: SearchPosts,
  serverConfig?: ActionConfig,
): Promise<ActionResult<SearchPostsResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "searchPosts"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      query,
      page,
      pageSize,
      searchIn,
      status,
    },
    SearchPostsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  try {
    // 记录搜索开始时间
    const searchStartTime = performance.now();

    // 1. 对搜索词进行分词
    const tokens = await analyzeText(query);

    if (tokens.length === 0) {
      // 即使没有分词结果，也要记录搜索日志
      const searchEndTime = performance.now();
      const durationMs = Math.round(searchEndTime - searchStartTime);

      // 获取客户端 IP
      const clientIP = await getClientIP();

      const { after } = await import("next/server");
      after(async () => {
        await prisma.searchLog.create({
          data: {
            query,
            tokens: [],
            resultCount: 0,
            durationMs,
            ip: clientIP,
            sessionId: sessionId || null,
            visitorId: visitorId || null,
          },
        });
      });

      return response.ok({
        data: {
          posts: [],
          total: 0,
          query,
          tokensUsed: [],
        },
      });
    }

    // 2. 转义 token 以便安全地用于 PostgreSQL tsquery
    // 策略：直接用双引号包裹所有 token，确保安全
    const escapeTsqueryToken = (token: string): string => {
      // 转义反斜杠和双引号，然后用引号包裹
      const escaped = token.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return `'${escaped}'`;
    };

    // 转义所有 tokens
    const escapedTokens = tokens.map(escapeTsqueryToken);

    // 3. 准备查询字符串
    // OR 查询：用于 WHERE 过滤（保证召回率）和基础相关性
    const orQueryStr = escapedTokens.join(" | ");
    // AND 查询：用于排序加分，奖励包含所有词的文章
    const andQueryStr = escapedTokens.join(" & ");
    // PHRASE 查询：用于排序加分，奖励包含连续短语的文章
    const phraseQueryStr = escapedTokens.join(" <-> ");

    // 3. 根据 searchIn 参数决定搜索字段和排名计算
    // 我们将使用三个参数 $1(OR), $2(AND), $3(PHRASE)
    // 基础权重配置
    const weights = {
      title: {
        or: 2.0,
        and: 5.0,
        phrase: 10.0,
      },
      content: {
        or: 1.0,
        and: 2.0,
        phrase: 5.0,
      },
    };

    let whereClause = "";
    let rankExpression = "";

    if (searchIn === "title") {
      whereClause = `"titleSearchVector" @@ to_tsquery('simple', $1)`;
      rankExpression = `
        (
          ts_rank_cd("titleSearchVector", to_tsquery('simple', $1)) * ${weights.title.or} +
          ts_rank_cd("titleSearchVector", to_tsquery('simple', $2)) * ${weights.title.and} +
          ts_rank_cd("titleSearchVector", to_tsquery('simple', $3)) * ${weights.title.phrase}
        )
      `;
    } else if (searchIn === "content") {
      whereClause = `"contentSearchVector" @@ to_tsquery('simple', $1)`;
      rankExpression = `
        (
          ts_rank_cd("contentSearchVector", to_tsquery('simple', $1), 32) * ${weights.content.or} +
          ts_rank_cd("contentSearchVector", to_tsquery('simple', $2), 32) * ${weights.content.and} +
          ts_rank_cd("contentSearchVector", to_tsquery('simple', $3), 32) * ${weights.content.phrase}
        )
      `;
    } else {
      // both
      whereClause = `("titleSearchVector" @@ to_tsquery('simple', $1) OR "contentSearchVector" @@ to_tsquery('simple', $1))`;
      rankExpression = `
        (
          -- 标题得分 (高权重，无归一化)
          ts_rank_cd("titleSearchVector", to_tsquery('simple', $1)) * ${weights.title.or} +
          ts_rank_cd("titleSearchVector", to_tsquery('simple', $2)) * ${weights.title.and} +
          ts_rank_cd("titleSearchVector", to_tsquery('simple', $3)) * ${weights.title.phrase} +
          -- 内容得分 (低权重，有归一化)
          ts_rank_cd("contentSearchVector", to_tsquery('simple', $1), 32) * ${weights.content.or} +
          ts_rank_cd("contentSearchVector", to_tsquery('simple', $2), 32) * ${weights.content.and} +
          ts_rank_cd("contentSearchVector", to_tsquery('simple', $3), 32) * ${weights.content.phrase}
        )
      `;
    }

    // 4. 构建完整的 WHERE 条件
    // 参数索引偏移：搜索相关参数占用了 $1, $2, $3
    // 如果有 status，它是 $4
    const statusFilter = status ? ` AND "status" = $4` : "";
    const fullWhereClause = `${whereClause}${statusFilter} AND "deletedAt" IS NULL`;

    // 5. 计算总数
    // count 查询只需要 $1 (OR query) 和 status (如果有)
    const countQuery = `
      SELECT COUNT(*)::bigint as count
      FROM "Post"
      WHERE ${whereClause}${status ? ` AND "status" = $2` : ""} AND "deletedAt" IS NULL
    `;

    const countParams = status ? [orQueryStr, status] : [orQueryStr];

    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      countQuery,
      ...countParams,
    );

    const total = Number(countResult[0]?.count || 0);

    if (total === 0) {
      // 即使没有搜索结果，也要记录搜索日志
      const searchEndTime = performance.now();
      const durationMs = Math.round(searchEndTime - searchStartTime);

      // 获取客户端 IP
      const clientIP = await getClientIP();

      const { after } = await import("next/server");
      after(async () => {
        await prisma.searchLog.create({
          data: {
            query,
            tokens,
            resultCount: 0,
            durationMs,
            ip: clientIP,
            sessionId: sessionId || null,
            visitorId: visitorId || null,
          },
        });
      });

      return response.ok({
        data: {
          posts: [],
          total: 0,
          query,
          tokensUsed: tokens,
        },
      });
    }

    // 6. 执行搜索查询（限制最多20条）
    const skip = (page - 1) * pageSize;
    const effectivePageSize = Math.min(pageSize, 20); // 限制最多20条

    // 参数索引:
    // $1: orQuery
    // $2: andQuery
    // $3: phraseQuery
    // $4: status (optional)
    // Next: limit, offset

    // 根据是否有 status 决定 limit/offset 的索引
    const limitIdx = status ? 5 : 4;
    const offsetIdx = status ? 6 : 5;

    const searchQuery = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.status,
        p."publishedAt",
        p."createdAt",
        p."updatedAt",
        p."userUid",
        p."isPinned",
        (${rankExpression}) as rank,
        p.plain
      FROM "Post" p
      WHERE ${fullWhereClause}
      ORDER BY rank DESC, p."updatedAt" DESC
      LIMIT $${limitIdx}
      OFFSET $${offsetIdx}
    `;

    const searchParams: (string | number)[] = [
      orQueryStr,
      andQueryStr,
      phraseQueryStr,
    ];
    if (status) searchParams.push(status);
    searchParams.push(effectivePageSize, skip);

    const rawPosts = await prisma.$queryRawUnsafe<
      Array<{
        id: number;
        slug: string;
        title: string;
        status: string;
        publishedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        userUid: number;
        isPinned: boolean;
        rank: number;
        plain: string | null;
      }>
    >(searchQuery, ...searchParams);

    // 7. 使用 Prisma 关系查询获取完整的文章信息（包括分类、标签、封面）
    const postIds = rawPosts.map((p) => p.id);

    const posts = await prisma.post.findMany({
      where: {
        id: { in: postIds },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        isPinned: true,
        userUid: true,
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
        mediaRefs: {
          where: {
            slot: "featuredImage",
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
          take: 1,
        },
      },
    });

    // 构建 postId 到 rank 和 highlight 的映射
    const postMetaMap = new Map(
      rawPosts.map((p) => [
        p.id,
        {
          rank: p.rank,
          titleHighlight: highlightTitle(p.title, tokens),
          excerptHighlight: p.plain
            ? generateSmartExcerpt(p.plain, tokens)
            : null,
        },
      ]),
    );

    // 8. 获取作者信息
    const userUids = posts.map((p) => p.userUid);
    const users = await prisma.user.findMany({
      where: {
        uid: { in: userUids },
      },
      select: {
        uid: true,
        username: true,
        nickname: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.uid, u]));

    // 9. 组装结果
    // 关键修正：必须遍历 rawPosts (有序) 而不是 posts (无序)，以保持搜索排名
    const postsMap = new Map(posts.map((p) => [p.id, p]));

    // 收集所有分类 ID 批量获取路径
    const allCategoryIds = new Set<number>();
    posts.forEach((p) => {
      p.categories.forEach((cat) => allCategoryIds.add(cat.id));
    });

    const { batchGetCategoryPaths } = await import(
      "@/lib/server/category-utils"
    );
    const categoryPathsMap = await batchGetCategoryPaths(
      Array.from(allCategoryIds),
    );

    const result = rawPosts
      .map((rawPost) => {
        const post = postsMap.get(rawPost.id);
        if (!post) return null;

        // 展开分类并去重
        const expandedCategories: { name: string; slug: string }[] = [];
        const seenSlugs = new Set<string>();

        post.categories.forEach((cat) => {
          const fullPath = categoryPathsMap.get(cat.id) || [];
          fullPath.forEach((pathItem) => {
            if (!seenSlugs.has(pathItem.slug)) {
              seenSlugs.add(pathItem.slug);
              expandedCategories.push(pathItem);
            }
          });
        });

        const author = userMap.get(post.userUid) || {
          uid: post.userUid,
          username: "unknown",
          nickname: null,
        };

        const postMeta = postMetaMap.get(post.id) || {
          rank: 0,
          titleHighlight: post.title,
          excerptHighlight: null,
        };

        const mediaRef = post.mediaRefs[0];
        const coverData = mediaRef
          ? {
              url: `/p/${mediaRef.media.shortHash}${generateSignature(mediaRef.media.shortHash)}`,
              width: mediaRef.media.width,
              height: mediaRef.media.height,
              blur: mediaRef.media.blur,
            }
          : undefined;

        return {
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          status: post.status as PostStatus,
          publishedAt: post.publishedAt?.toISOString() || null,
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
          author,
          rank: postMeta.rank,
          isPinned: post.isPinned,
          categories: expandedCategories,
          tags: post.tags,
          coverData,
          titleHighlight: postMeta.titleHighlight,
          excerptHighlight: postMeta.excerptHighlight,
        } as SearchPostsResultItem;
      })
      .filter((item): item is SearchPostsResultItem => item !== null);

    // 10. 记录搜索日志
    const searchEndTime = performance.now();
    const durationMs = Math.round(searchEndTime - searchStartTime);

    // 获取客户端 IP
    const clientIP = await getClientIP();

    const { after } = await import("next/server");
    after(async () => {
      await prisma.searchLog.create({
        data: {
          query,
          tokens,
          resultCount: total,
          durationMs,
          ip: clientIP,
          sessionId: sessionId || null,
          visitorId: visitorId || null,
        },
      });
    });

    // 11. 返回结果
    const meta = {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page < Math.ceil(total / pageSize),
      hasPrev: page > 1,
    };

    return response.ok({
      data: {
        posts: result,
        total,
        query,
        tokensUsed: tokens,
      },
      meta,
    });
  } catch (error) {
    console.error("搜索文章失败:", error);
    return response.serverError({ message: "搜索文章失败" });
  }
}

/*
  searchSite - 全站搜索
*/
export async function searchSite(
  params: SearchSiteParams,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<SearchSiteResult | null>>>;
export async function searchSite(
  params: SearchSiteParams,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<SearchSiteResult | null>>;
export async function searchSite(
  { query, sessionId, visitorId }: SearchSiteParams,
  serverConfig?: ActionConfig,
): Promise<ActionResult<SearchSiteResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "searchSite"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      query,
      sessionId,
      visitorId,
    },
    SearchSiteSchema,
  );

  if (validationError) return response.badRequest(validationError);

  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return response.ok({
      data: createEmptySearchSiteResult(""),
    });
  }

  const likePattern = `%${normalizedQuery}%`;
  const prefixPattern = `${normalizedQuery}%`;

  try {
    const [postsResponse, rawProjects, rawTags, rawCategories, rawPhotos] =
      await Promise.all([
        searchPosts({
          query: normalizedQuery,
          page: 1,
          pageSize: 20,
          searchIn: "both",
          status: "PUBLISHED",
          sessionId,
          visitorId,
        }),
        prisma.$queryRaw<
          Array<{
            id: number;
            slug: string;
            title: string;
            description: string;
          }>
        >`
          SELECT
            p."id",
            p."slug",
            p."title",
            p."description"
          FROM "Project" p
          WHERE p."status" = 'PUBLISHED'
            AND (
              LOWER(p."title") LIKE LOWER(${likePattern})
              OR LOWER(p."slug") LIKE LOWER(${likePattern})
              OR LOWER(COALESCE(p."description", '')) LIKE LOWER(${likePattern})
            )
          ORDER BY
            CASE
              WHEN LOWER(p."title") LIKE LOWER(${prefixPattern}) THEN 0
              WHEN LOWER(p."slug") LIKE LOWER(${prefixPattern}) THEN 1
              ELSE 2
            END,
            COALESCE(p."publishedAt", p."updatedAt") DESC
          LIMIT 20
        `,
        prisma.$queryRaw<
          Array<{
            slug: string;
            name: string;
            description: string | null;
          }>
        >`
          SELECT
            t."slug",
            t."name",
            t."description"
          FROM "Tag" t
          WHERE
            LOWER(t."name") LIKE LOWER(${likePattern})
            OR LOWER(t."slug") LIKE LOWER(${likePattern})
            OR LOWER(COALESCE(t."description", '')) LIKE LOWER(${likePattern})
          ORDER BY
            CASE
              WHEN LOWER(t."name") LIKE LOWER(${prefixPattern}) THEN 0
              WHEN LOWER(t."slug") LIKE LOWER(${prefixPattern}) THEN 1
              ELSE 2
            END,
            t."updatedAt" DESC
          LIMIT 20
        `,
        prisma.$queryRaw<
          Array<{
            id: number;
            slug: string;
            name: string;
            fullSlug: string;
            description: string | null;
          }>
        >`
          SELECT
            c."id",
            c."slug",
            c."name",
            c."fullSlug",
            c."description"
          FROM "Category" c
          WHERE
            LOWER(c."name") LIKE LOWER(${likePattern})
            OR LOWER(c."slug") LIKE LOWER(${likePattern})
            OR LOWER(c."fullSlug") LIKE LOWER(${likePattern})
            OR LOWER(COALESCE(c."description", '')) LIKE LOWER(${likePattern})
          ORDER BY
            CASE
              WHEN LOWER(c."name") LIKE LOWER(${prefixPattern}) THEN 0
              WHEN LOWER(c."fullSlug") LIKE LOWER(${prefixPattern}) THEN 1
              ELSE 2
            END,
            c."depth" ASC,
            c."updatedAt" DESC
          LIMIT 20
        `,
        prisma.$queryRaw<
          Array<{
            slug: string;
            name: string;
            description: string | null;
            shortHash: string;
          }>
        >`
          SELECT
            p."slug",
            p."name",
            p."description",
            m."shortHash"
          FROM "Photo" p
          INNER JOIN "Media" m ON m."id" = p."mediaId"
          WHERE
            LOWER(p."name") LIKE LOWER(${likePattern})
            OR LOWER(p."slug") LIKE LOWER(${likePattern})
            OR LOWER(COALESCE(p."description", '')) LIKE LOWER(${likePattern})
            OR LOWER(COALESCE(m."originalName", '')) LIKE LOWER(${likePattern})
            OR LOWER(COALESCE(m."altText", '')) LIKE LOWER(${likePattern})
          ORDER BY
            CASE
              WHEN LOWER(p."name") LIKE LOWER(${prefixPattern}) THEN 0
              WHEN LOWER(p."slug") LIKE LOWER(${prefixPattern}) THEN 1
              ELSE 2
            END,
            p."sortTime" DESC
          LIMIT 20
        `,
      ]);

    const posts: SearchSitePostItem[] =
      postsResponse.success && postsResponse.data?.posts
        ? postsResponse.data.posts.map((post) => ({
            slug: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            titleHighlight: post.titleHighlight,
            excerptHighlight: post.excerptHighlight,
          }))
        : [];

    const projects: SearchSiteProjectItem[] = rawProjects.map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      description: project.description,
    }));

    const tags: SearchSiteTagItem[] = rawTags.map((tag) => ({
      slug: tag.slug,
      name: tag.name,
      description: tag.description,
    }));

    const categories: SearchSiteCategoryItem[] = rawCategories.map(
      (category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        fullSlug: category.fullSlug || category.slug,
        description: category.description,
      }),
    );

    const photos: SearchSitePhotoItem[] = rawPhotos.map((photo) => ({
      slug: photo.slug,
      name: photo.name,
      description: photo.description,
      imageUrl: `/p/${photo.shortHash}${generateSignature(photo.shortHash)}`,
    }));

    const counts = {
      posts: posts.length,
      projects: projects.length,
      tags: tags.length,
      categories: categories.length,
      photos: photos.length,
      total:
        posts.length +
        projects.length +
        tags.length +
        categories.length +
        photos.length,
    };

    return response.ok({
      data: {
        query: normalizedQuery,
        posts,
        projects,
        tags,
        categories,
        photos,
        counts,
      },
    });
  } catch (error) {
    console.error("全站搜索失败:", error);
    return response.serverError({ message: "全站搜索失败" });
  }
}

/*
  getPostTokenDetails - 获取文章分词详情
*/
export async function getPostTokenDetails(
  params: Omit<GetPostTokenDetails, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<PostTokenDetails | null>>>;
export async function getPostTokenDetails(
  params: Omit<GetPostTokenDetails, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<PostTokenDetails | null>>;
export async function getPostTokenDetails(
  { slug }: Omit<GetPostTokenDetails, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostTokenDetails | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getPostTokenDetails"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      slug,
    },
    GetPostTokenDetailsSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以查看
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 获取文章基本信息
    const post = await prisma.post.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        tokenizedAt: true,
      },
    });

    if (!post) {
      return response.notFound({ message: "文章不存在" });
    }

    // 使用原生查询获取分词信息
    const tokenData = await prisma.$queryRawUnsafe<
      Array<{
        titleSearchVector: string | null;
        contentSearchVector: string | null;
      }>
    >(
      `SELECT "titleSearchVector"::text as "titleSearchVector", "contentSearchVector"::text as "contentSearchVector" FROM "Post" WHERE id = $1`,
      post.id,
    );

    if (
      !tokenData[0] ||
      (!tokenData[0].titleSearchVector && !tokenData[0].contentSearchVector)
    ) {
      return response.notFound({ message: "该文章尚未建立索引" });
    }

    // 解析 tsvector 格式的分词数据
    const titleSearchVectorStr = tokenData[0].titleSearchVector || "";
    const contentSearchVectorStr = tokenData[0].contentSearchVector || "";

    // 从 tsvector 格式中提取词元并按位置排序
    // tsvector 格式示例：'中国':1 '人民':2 '共和国':3
    // 或带多个位置：'中国':1,5 '人民':2
    const extractTokensWithFrequency = (tsvectorStr: string) => {
      const matches = tsvectorStr.match(/'([^']+)':[\d,]+/g) || [];

      // 提取词元和它们的所有位置
      const tokensWithPos = matches
        .map((match) => {
          const tokenMatch = match.match(/'([^']+)':([\d,]+)/);
          if (!tokenMatch || !tokenMatch[1] || !tokenMatch[2]) return null;

          const token = tokenMatch[1];
          const positions = tokenMatch[2].split(",").map(Number);

          return { token, positions };
        })
        .filter(
          (item): item is { token: string; positions: number[] } =>
            item !== null,
        );

      // 展开所有位置，形成 (token, position) 对，以便完整展示所有分词
      const allOccurrences: { token: string; position: number }[] = [];
      tokensWithPos.forEach(({ token, positions }) => {
        positions.forEach((pos) => {
          allOccurrences.push({ token, position: pos });
        });
      });

      // 按位置排序
      allOccurrences.sort((a, b) => a.position - b.position);

      // 返回按位置排序的词元列表
      const orderedTokens = allOccurrences.map((item) => item.token);

      // 统计词频（去除单字符）
      const wordFrequency = new Map<string, number>();
      tokensWithPos.forEach(({ token, positions }) => {
        // 只统计长度大于1的词
        if (token.length > 1) {
          wordFrequency.set(token, positions.length);
        }
      });

      // 按出现次数排序
      const wordCloud = Array.from(wordFrequency.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count);

      return { orderedTokens, wordCloud };
    };

    const titleResult = extractTokensWithFrequency(titleSearchVectorStr);
    const contentResult = extractTokensWithFrequency(contentSearchVectorStr);

    const titleTokens = titleResult.orderedTokens;
    const contentTokens = contentResult.orderedTokens;

    // 合并标题和内容的词云，重新统计
    const combinedWordFrequency = new Map<string, number>();

    [...titleResult.wordCloud, ...contentResult.wordCloud].forEach(
      ({ word, count }) => {
        const currentCount = combinedWordFrequency.get(word) || 0;
        combinedWordFrequency.set(word, currentCount + count);
      },
    );

    const wordCloud = Array.from(combinedWordFrequency.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);

    // 计算分词体积
    const tokenSize =
      new Blob([titleSearchVectorStr]).size +
      new Blob([contentSearchVectorStr]).size;

    return response.ok({
      data: {
        slug: post.slug,
        title: post.title,
        titleTokens,
        contentTokens,
        titleTokenCount: titleTokens.length,
        contentTokenCount: contentTokens.length,
        totalTokenCount: titleTokens.length + contentTokens.length,
        tokenSize,
        tokenizedAt: post.tokenizedAt?.toISOString() || null,
        wordCloud,
      },
    });
  } catch (error) {
    console.error("获取文章分词详情失败:", error);
    return response.serverError({ message: "获取文章分词详情失败" });
  }
}

/*
  getSearchIndexStats - 获取搜索索引统计信息
*/
export async function getSearchIndexStats(
  params: Omit<GetSearchIndexStats, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<SearchIndexStatsResult | null>>>;
export async function getSearchIndexStats(
  params: Omit<GetSearchIndexStats, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<SearchIndexStatsResult | null>>;
export async function getSearchIndexStats(
  { force = false }: Omit<GetSearchIndexStats, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<SearchIndexStatsResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getSearchIndexStats"))) {
    return response.tooManyRequests();
  }

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以查看
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 缓存键
    const cacheKey = generateCacheKey("stat", "search", "index");

    // 如果不强制刷新，先尝试从缓存获取
    if (!force) {
      const { getCache } = await import("@/lib/server/cache");
      const cached = await getCache<SearchIndexStatsResult>(cacheKey);
      if (cached) {
        // 标记为来自缓存，并确保 topWords 字段存在（向后兼容）
        return response.ok({
          data: {
            ...cached,
            cached: true,
            topWords: cached.topWords || [],
          },
        });
      }
    }

    // 1. 获取总文章数
    const totalPosts = await prisma.post.count({
      where: { deletedAt: null },
    });

    // 2. 统计各种状态的文章数量
    const posts = await prisma.post.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        updatedAt: true,
        tokenizedAt: true,
      },
    });

    let upToDatePosts = 0;
    let outdatedPosts = 0;
    let neverIndexedPosts = 0;

    for (const post of posts) {
      if (!post.tokenizedAt) {
        neverIndexedPosts++;
      } else if (post.tokenizedAt < post.updatedAt) {
        outdatedPosts++;
      } else {
        upToDatePosts++;
      }
    }

    const indexedPosts = upToDatePosts + outdatedPosts;

    // 3. 统计词元数和索引体积
    const postIds = posts.filter((p) => p.tokenizedAt).map((p) => p.id);

    let totalTokenCount = 0;
    let totalTokenSize = 0;
    let topWords: Array<{ word: string; count: number }> = [];

    if (postIds.length > 0) {
      const tokenData = await prisma.$queryRawUnsafe<
        Array<{
          titleSearchVector: string | null;
          contentSearchVector: string | null;
        }>
      >(
        `SELECT "titleSearchVector"::text as "titleSearchVector", "contentSearchVector"::text as "contentSearchVector" FROM "Post" WHERE id = ANY($1)`,
        postIds,
      );

      // 词频统计 Map
      const wordFrequency = new Map<string, number>();

      for (const data of tokenData) {
        const titleSearchVectorStr = data.titleSearchVector || "";
        const contentSearchVectorStr = data.contentSearchVector || "";

        // 计算字节大小
        totalTokenSize +=
          new Blob([titleSearchVectorStr]).size +
          new Blob([contentSearchVectorStr]).size;

        // 计算词元数并统计词频
        const titleTokenMatches = titleSearchVectorStr.match(/'[^']+'/g) || [];
        const contentTokenMatches =
          contentSearchVectorStr.match(/'[^']+'/g) || [];
        totalTokenCount +=
          titleTokenMatches.length + contentTokenMatches.length;

        // 提取词元并统计频率（标题和内容合并统计）
        const allMatches = [
          ...titleSearchVectorStr.matchAll(/'([^']+)':([\d,]+)/g),
          ...contentSearchVectorStr.matchAll(/'([^']+)':([\d,]+)/g),
        ];

        for (const match of allMatches) {
          if (match[1] && match[2]) {
            const word = match[1];
            // 只统计长度大于1的词（过滤单字）
            if (word.length > 1) {
              const positions = match[2].split(",");
              const count = positions.length; // 该词在这篇文章中出现的次数
              wordFrequency.set(word, (wordFrequency.get(word) || 0) + count);
            }
          }
        }
      }

      // 获取 Top 500 高频词
      topWords = Array.from(wordFrequency.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 500);
    }

    // 4. 统计近期索引活动
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentIndexed7Days = await prisma.post.count({
      where: {
        deletedAt: null,
        tokenizedAt: {
          gte: sevenDaysAgo,
        },
      },
    });

    const recentIndexed30Days = await prisma.post.count({
      where: {
        deletedAt: null,
        tokenizedAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // 5. 获取自定义词典数量
    const customWordCount = await prisma.customDictionary.count();

    // 6. 计算平均值和比率
    const avgTokenCount = indexedPosts > 0 ? totalTokenCount / indexedPosts : 0;
    const avgTokenSize = indexedPosts > 0 ? totalTokenSize / indexedPosts : 0;
    const indexRate = totalPosts > 0 ? (indexedPosts / totalPosts) * 100 : 0;
    const upToDateRate =
      indexedPosts > 0 ? (upToDatePosts / indexedPosts) * 100 : 0;

    // 7. 构建统计结果
    const stats: SearchIndexStatsResult = {
      totalPosts,
      indexedPosts,
      upToDatePosts,
      outdatedPosts,
      neverIndexedPosts,
      totalTokenCount,
      totalTokenSize,
      avgTokenCount: Math.round(avgTokenCount),
      avgTokenSize: Math.round(avgTokenSize),
      recentIndexed7Days,
      recentIndexed30Days,
      customWordCount,
      indexRate: Math.round(indexRate * 100) / 100,
      upToDateRate: Math.round(upToDateRate * 100) / 100,
      topWords,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    // 8. 缓存统计结果（1小时）
    const { setCache } = await import("@/lib/server/cache");
    await setCache(cacheKey, stats, { ttl: 3600 });

    return response.ok({ data: stats });
  } catch (error) {
    console.error("获取搜索索引统计失败:", error);
    return response.serverError({ message: "获取搜索索引统计失败" });
  }
}

/*
  getSearchLogStats - 获取搜索日志统计信息
*/
export async function getSearchLogStats(
  params: Omit<GetSearchLogStats, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<SearchLogStatsResult | null>>>;
export async function getSearchLogStats(
  params: Omit<GetSearchLogStats, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<SearchLogStatsResult | null>>;
export async function getSearchLogStats(
  { days = 30, force = false }: Omit<GetSearchLogStats, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<SearchLogStatsResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getSearchLogStats"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    { days, force },
    GetSearchLogStatsSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以查看
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 缓存键
    const cacheKey = generateCacheKey("stat", "search", "log", days);

    // 如果不强制刷新，先尝试从缓存获取
    if (!force) {
      const { getCache } = await import("@/lib/server/cache");
      const cached = await getCache<SearchLogStatsResult>(cacheKey);
      if (cached) {
        return response.ok({
          data: {
            ...cached,
            cached: true,
          },
        });
      }
    }

    // 计算日期范围
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);

    // 1. 获取日期范围内的所有搜索日志
    const searchLogs = await prisma.searchLog.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // 2. 统计基础数据
    const totalSearches = searchLogs.length;
    const uniqueQueriesSet = new Set(searchLogs.map((log) => log.query));
    const uniqueQueries = uniqueQueriesSet.size;

    const totalResultCount = searchLogs.reduce(
      (sum, log) => sum + log.resultCount,
      0,
    );
    const avgResultCount =
      totalSearches > 0 ? totalResultCount / totalSearches : 0;

    const zeroResultCount = searchLogs.filter(
      (log) => log.resultCount === 0,
    ).length;
    const zeroResultRate =
      totalSearches > 0 ? (zeroResultCount / totalSearches) * 100 : 0;

    const totalDuration = searchLogs.reduce(
      (sum, log) => sum + (log.durationMs || 0),
      0,
    );
    const durationCount = searchLogs.filter(
      (log) => log.durationMs !== null,
    ).length;
    const avgDuration = durationCount > 0 ? totalDuration / durationCount : 0;

    // 3. 按日期分组统计
    const dailyMap = new Map<string, SearchLogDailyTrend>();

    for (const log of searchLogs) {
      const dateKey = getLocalDateString(log.createdAt);

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          searchCount: 0,
          uniqueVisitors: 0,
          zeroResultCount: 0,
          avgDuration: 0,
        });
      }

      const trend = dailyMap.get(dateKey)!;
      trend.searchCount++;
      if (log.resultCount === 0) {
        trend.zeroResultCount++;
      }
    }

    // 4. 计算每日唯一访客数和平均耗时
    for (const [dateKey, trend] of dailyMap.entries()) {
      const dayLogs = searchLogs.filter((log) => {
        const logDateKey = getLocalDateString(log.createdAt);
        return logDateKey === dateKey;
      });
      // 统计唯一的 visitorId（排除 null 值）
      const uniqueVisitorsSet = new Set(
        dayLogs
          .filter((log) => log.visitorId !== null)
          .map((log) => log.visitorId),
      );
      trend.uniqueVisitors = uniqueVisitorsSet.size;

      const dayDuration = dayLogs.reduce(
        (sum, log) => sum + (log.durationMs || 0),
        0,
      );
      const dayDurationCount = dayLogs.filter(
        (log) => log.durationMs !== null,
      ).length;
      trend.avgDuration =
        dayDurationCount > 0 ? dayDuration / dayDurationCount : 0;
    }

    // 5. 填充缺失的日期
    const dailyTrend: SearchLogDailyTrend[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateKey = getLocalDateString(currentDate);
      dailyTrend.push(
        dailyMap.get(dateKey) || {
          date: dateKey,
          searchCount: 0,
          uniqueVisitors: 0,
          zeroResultCount: 0,
          avgDuration: 0,
        },
      );
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 6. 统计热门搜索词（原始搜索词）
    const queryFrequency = new Map<string, number>();
    for (const log of searchLogs) {
      queryFrequency.set(log.query, (queryFrequency.get(log.query) || 0) + 1);
    }

    const topQueries = Array.from(queryFrequency.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // 7. 统计热门分词（token 频率统计）
    // 对每次搜索的 token 去重，防止单次搜索中的重复 token 影响统计
    const tokenFrequency = new Map<string, number>();
    for (const log of searchLogs) {
      // 先对本次搜索的 tokens 去重
      const uniqueTokens = new Set(log.tokens);
      // 然后遍历去重后的 tokens 进行统计
      for (const token of uniqueTokens) {
        tokenFrequency.set(token, (tokenFrequency.get(token) || 0) + 1);
      }
    }

    const topTokens = Array.from(tokenFrequency.entries())
      .map(([token, count]) => ({ token, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // 8. 统计无结果热门词
    const zeroResultQueryFrequency = new Map<string, number>();
    for (const log of searchLogs.filter((l) => l.resultCount === 0)) {
      zeroResultQueryFrequency.set(
        log.query,
        (zeroResultQueryFrequency.get(log.query) || 0) + 1,
      );
    }

    const topZeroResultQueries = Array.from(zeroResultQueryFrequency.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // 9. 构建统计结果
    const stats: SearchLogStatsResult = {
      totalSearches,
      uniqueQueries,
      avgResultCount: Math.round(avgResultCount * 100) / 100,
      zeroResultRate: Math.round(zeroResultRate * 100) / 100,
      avgDuration: Math.round(avgDuration),
      dailyTrend,
      topQueries,
      topTokens,
      topZeroResultQueries,
      cached: false,
      generatedAt: new Date().toISOString(),
    };

    // 8. 缓存统计结果（1小时）
    const { setCache } = await import("@/lib/server/cache");
    await setCache(cacheKey, stats, { ttl: 3600 });

    return response.ok({ data: stats });
  } catch (error) {
    console.error("获取搜索日志统计失败:", error);
    return response.serverError({ message: "获取搜索日志统计失败" });
  }
}

/*
  getSearchLogs - 获取搜索日志列表
*/
export async function getSearchLogs(
  params: Omit<GetSearchLogs, "access_token">,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<SearchLogItem[] | null>>>;
export async function getSearchLogs(
  params: Omit<GetSearchLogs, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<SearchLogItem[] | null>>;
export async function getSearchLogs(
  {
    page = 1,
    pageSize = 25,
    sortBy = "createdAt",
    sortOrder = "desc",
    query: queryFilter,
    minResultCount,
    maxResultCount,
    hasZeroResults,
    dateFrom,
    dateTo,
  }: Omit<GetSearchLogs, "access_token">,
  serverConfig?: ActionConfig,
): Promise<ActionResult<SearchLogItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers(), "getSearchLogs"))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      page,
      pageSize,
      sortBy,
      sortOrder,
      query: queryFilter,
      minResultCount,
      maxResultCount,
      hasZeroResults,
      dateFrom,
      dateTo,
    },
    GetSearchLogsSchema.omit({ access_token: true }),
  );

  if (validationError) return response.badRequest(validationError);

  // 从 cookies 获取 access token
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const access_token = cookieStore.get("ACCESS_TOKEN")?.value;

  if (!access_token) {
    return response.unauthorized({ message: "请先登录" });
  }

  // 身份验证 - 仅管理员和编辑可以查看
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Record<string, unknown> = {};

    if (queryFilter) {
      where.query = {
        contains: queryFilter,
        mode: "insensitive",
      };
    }

    if (minResultCount !== undefined || maxResultCount !== undefined) {
      where.resultCount = {};
      if (minResultCount !== undefined) {
        (where.resultCount as Record<string, unknown>).gte = minResultCount;
      }
      if (maxResultCount !== undefined) {
        (where.resultCount as Record<string, unknown>).lte = maxResultCount;
      }
    }

    if (hasZeroResults !== undefined) {
      where.resultCount = hasZeroResults ? 0 : { gt: 0 };
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(
          dateTo + "T23:59:59.999Z",
        );
      }
    }

    // 获取搜索日志
    const logs = await prisma.searchLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: {
        [sortBy]: sortOrder,
      },
    });

    // 获取总数
    const total = await prisma.searchLog.count({ where });

    // 计算分页元数据
    const totalPages = Math.ceil(total / pageSize);
    const meta = {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    // 转换为返回格式
    const items: SearchLogItem[] = logs.map((log) => ({
      id: log.id,
      query: log.query,
      tokens: log.tokens,
      resultCount: log.resultCount,
      durationMs: log.durationMs,
      createdAt: log.createdAt.toISOString(),
      ip: log.ip,
      sessionId: log.sessionId,
      visitorId: log.visitorId,
      location: log.ip ? resolveIpLocation(log.ip) : null,
    }));

    return response.ok({
      data: items,
      meta,
    });
  } catch (error) {
    console.error("获取搜索日志列表失败:", error);
    return response.serverError({ message: "获取搜索日志列表失败" });
  }
}
