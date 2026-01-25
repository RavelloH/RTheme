"use server";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { updateTag } from "next/cache";
import prisma from "@/lib/server/prisma";
import ResponseBuilder from "@/lib/server/response";
import { authVerify } from "@/lib/server/auth-verify";
import limitControl from "@/lib/server/rate-limit";
import { validateData } from "@/lib/server/validator";
import { logAuditEvent } from "@/lib/server/audit";
import { analyzeText } from "@/lib/server/tokenizer";
import { generateSignature } from "@/lib/server/image-crypto";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import type {
  ApiResponse,
  ApiResponseData,
} from "@repo/shared-types/api/common";
import type {
  TestTokenize,
  AddCustomWord,
  IndexPosts,
  GetIndexStatus,
  SearchPosts,
  TestTokenizeResult,
  AddCustomWordResult,
  IndexPostsResult,
  IndexStatusItem,
  SearchPostsResult,
  GetPostTokenDetails,
  PostTokenDetails,
  GetCustomWords,
  CustomWordItem,
  DeleteCustomWord,
  DeleteCustomWordResult,
  DeleteIndex,
  DeleteIndexResult,
  GetSearchIndexStats,
  SearchIndexStatsResult,
  SearchPostsResultItem,
} from "@repo/shared-types/api/search";
import {
  TestTokenizeSchema,
  AddCustomWordSchema,
  IndexPostsSchema,
  GetIndexStatusSchema,
  SearchPostsSchema,
  GetPostTokenDetailsSchema,
  DeleteCustomWordSchema,
  DeleteIndexSchema,
} from "@repo/shared-types/api/search";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/**
 * 格式化时间，自动选择合适的单位
 * @param microseconds 微秒
 * @returns 格式化后的时间字符串
 */
function formatDuration(microseconds: number): string {
  if (microseconds < 1000) {
    // 小于 1ms，显示微秒
    return `${microseconds}μs`;
  } else if (microseconds < 1000000) {
    // 小于 1s，显示毫秒
    const ms = (microseconds / 1000).toFixed(2);
    return `${ms}ms`;
  } else {
    // 大于等于 1s，显示秒
    const s = (microseconds / 1000000).toFixed(2);
    return `${s}s`;
  }
}

/**
 * 辅助函数：将 Markdown 转换为纯文本
 */
async function markdownToPlainText(markdown: string): Promise<string> {
  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeStringify);

    const vfile = await processor.process(markdown);
    const html = String(vfile);

    // 去除 HTML 标签，保留纯文本
    const plainText = html
      .replace(/<[^>]*>/g, " ") // 移除所有 HTML 标签
      .replace(/&nbsp;/g, " ") // 替换 &nbsp;
      .replace(/&lt;/g, "<") // 解码 HTML 实体
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ") // 合并多个空格
      .trim();

    return plainText;
  } catch (error) {
    console.error("Markdown 转换失败:", error);
    return markdown; // 失败时返回原始内容
  }
}

/**
 * 辅助函数：解析文章内容并提取纯文本
 * text-version v2: content 字段已经是最新内容
 */
async function extractTextFromContent(content: string): Promise<string> {
  // 第二步：将 Markdown/MDX 转换为纯文本
  return await markdownToPlainText(content);
}

/*
  testTokenize - 测试分词功能
*/
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

    // 记录审计日志
    const { after } = await import("next/server");
    after(async () => {
      await logAuditEvent({
        user: {
          uid: String(user.uid),
        },
        details: {
          action: "TEST_TOKENIZE",
          resourceType: "SEARCH",
          value: {
            old: null,
            new: {
              text: text.substring(0, 100),
              tokenCount: tokens.length,
              duration,
            },
          },
          description: `测试分词：${text.substring(0, 50)}...，共 ${tokens.length} 个词，耗时 ${formatDuration(duration)}`,
        },
      });
    });

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

    // 构建搜索查询：使用 OR 连接所有子词
    const searchQuery = tokens.join(" | ");

    let affectedPosts: Array<{ slug: string; title: string }> = [];

    if (tokens.length > 0) {
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
      wordData.word,
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
  { query, page = 1, pageSize = 10, searchIn = "both", status }: SearchPosts,
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
    // 1. 对搜索词进行分词
    const tokens = await analyzeText(query);

    if (tokens.length === 0) {
      return response.ok({
        data: {
          posts: [],
          total: 0,
          query,
          tokensUsed: [],
        },
      });
    }

    // 2. 将分词结果用空格连接，准备用于 to_tsquery
    const searchQueryStr = tokens.join(" | "); // 使用 OR 连接，匹配任意一个词即可

    // 3. 根据 searchIn 参数决定搜索字段和排名计算
    let whereClause = "";
    let rankExpression = "";

    if (searchIn === "title") {
      whereClause = `"titleSearchVector" @@ to_tsquery('simple', $1)`;
      rankExpression = `ts_rank("titleSearchVector", to_tsquery('simple', $1))`;
    } else if (searchIn === "content") {
      whereClause = `"contentSearchVector" @@ to_tsquery('simple', $1)`;
      rankExpression = `ts_rank("contentSearchVector", to_tsquery('simple', $1))`;
    } else {
      // both: 标题或内容匹配即可
      whereClause = `("titleSearchVector" @@ to_tsquery('simple', $1) OR "contentSearchVector" @@ to_tsquery('simple', $1))`;
      rankExpression = `
        ts_rank("titleSearchVector", to_tsquery('simple', $1)) * 2.0 +
        ts_rank("contentSearchVector", to_tsquery('simple', $1))
      `;
    }

    // 4. 构建完整的 WHERE 条件
    const statusFilter = status ? ` AND "status" = $2` : "";
    const fullWhereClause = `${whereClause}${statusFilter} AND "deletedAt" IS NULL`;

    // 5. 计算总数
    const countQuery = `
      SELECT COUNT(*)::bigint as count
      FROM "Post"
      WHERE ${fullWhereClause}
    `;

    const countParams = status ? [searchQueryStr, status] : [searchQueryStr];

    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      countQuery,
      ...countParams,
    );

    const total = Number(countResult[0]?.count || 0);

    if (total === 0) {
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
        ts_headline('simple', p.title, to_tsquery('simple', $1), 
          'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=5, MaxFragments=1, HighlightAll=FALSE') as "titleHighlight",
        (
          WITH token_data AS (
            -- 解析 tsvector 格式: 'word':1,2,3
            SELECT 
              regexp_matches[1] as token,
              string_to_array(regexp_matches[2], ',')::int[] as positions
            FROM regexp_matches(
              p."contentSearchVector"::text,
              '''([^'']+)'':([0-9,]+)',
              'g'
            ) AS regexp_matches
          ),
          matching_tokens AS (
            -- 找出匹配的词元及其位置
            SELECT DISTINCT token, unnest(positions) as pos
            FROM token_data
            WHERE to_tsvector('simple', token) @@ to_tsquery('simple', $1)
            ORDER BY pos
            LIMIT 5
          ),
          all_tokens_with_pos AS (
            -- 展开所有词元的位置
            SELECT token, unnest(positions) as pos
            FROM token_data
          ),
          context_positions AS (
            -- 获取所有匹配位置的上下文范围
            SELECT DISTINCT generate_series(
              mt.pos - 3,
              mt.pos + 3
            ) as ctx_pos, mt.pos as match_pos, mt.token as match_token
            FROM matching_tokens mt
          ),
          context_tokens AS (
            -- 获取上下文范围内的所有词元，并标记匹配的
            SELECT DISTINCT atp.token, atp.pos,
              CASE 
                WHEN atp.pos = cp.match_pos AND atp.token = cp.match_token 
                THEN true 
                ELSE false 
              END as is_match
            FROM context_positions cp
            JOIN all_tokens_with_pos atp ON atp.pos = cp.ctx_pos
          )
          SELECT string_agg(
            CASE WHEN is_match THEN '<mark>' || token || '</mark>' ELSE token END,
            ' ' ORDER BY pos
          )
          FROM context_tokens
        ) as "excerptHighlight"
      FROM "Post" p
      WHERE ${fullWhereClause}
      ORDER BY rank DESC, p."updatedAt" DESC
      LIMIT $${status ? 3 : 2}
      OFFSET $${status ? 4 : 3}
    `;

    const searchParams = status
      ? [searchQueryStr, status, effectivePageSize, skip]
      : [searchQueryStr, effectivePageSize, skip];

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
        titleHighlight: string;
        excerptHighlight: string | null;
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
          titleHighlight: p.titleHighlight,
          excerptHighlight: p.excerptHighlight,
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
    const result: SearchPostsResultItem[] = posts.map((post) => {
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
        status: post.status,
        publishedAt: post.publishedAt?.toISOString() || null,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        author,
        rank: postMeta.rank,
        isPinned: post.isPinned,
        categories: post.categories,
        tags: post.tags,
        coverData,
        titleHighlight: postMeta.titleHighlight,
        excerptHighlight: postMeta.excerptHighlight,
      };
    });

    // 10. 记录搜索日志
    const { after } = await import("next/server");
    after(async () => {
      await prisma.searchLog.create({
        data: {
          query,
          tokens,
          resultCount: total,
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

      // 按第一个位置排序，用于按位置展示
      const sortedTokens = [...tokensWithPos].sort(
        (a, b) => Math.min(...a.positions) - Math.min(...b.positions),
      );

      // 返回按位置排序的词元列表
      const orderedTokens = sortedTokens.map((item) => item.token);

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
    const cacheKey = "search-index-stats";

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

      // 获取 Top 100 高频词
      topWords = Array.from(wordFrequency.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 100);
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
