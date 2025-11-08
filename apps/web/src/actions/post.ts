"use server";
import { NextResponse } from "next/server";
import {
  GetPostsTrendsSchema,
  GetPostsTrends,
  PostTrendItem,
  GetPostsListSchema,
  GetPostsList,
  PostListItem,
  CreatePostSchema,
  CreatePost,
  CreatePostResult,
  UpdatePostsSchema,
  UpdatePosts,
  DeletePostsSchema,
  DeletePosts,
} from "@repo/shared-types/api/post";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "./audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/getClientInfo";
import { TextVersion } from "text-version";

type ActionEnvironment = "serverless" | "serveraction";
type ActionConfig = { environment?: ActionEnvironment };
type ActionResult<T extends ApiResponseData> =
  | NextResponse<ApiResponse<T>>
  | ApiResponse<T>;

/*
  getPostsTrends - 获取文章趋势数据
*/
export async function getPostsTrends(
  params: GetPostsTrends,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<PostTrendItem[] | null>>>;
export async function getPostsTrends(
  params: GetPostsTrends,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<PostTrendItem[] | null>>;
export async function getPostsTrends(
  { access_token, days = 365, count = 30 }: GetPostsTrends,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostTrendItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      days,
      count,
    },
    GetPostsTrendsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    const now = new Date();
    const daysAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 生成日期序列
    const datePoints: Date[] = [];
    const interval = Math.floor((days * 24 * 60 * 60 * 1000) / count);

    for (let i = 0; i < count; i++) {
      datePoints.push(new Date(daysAgo.getTime() + i * interval));
    }
    datePoints.push(now); // 确保包含当前时间点

    // 为每个时间点计算统计数据
    const allTrendData: PostTrendItem[] = await Promise.all(
      datePoints.map(async (date) => {
        const oneDayBefore = new Date(date.getTime() - 24 * 60 * 60 * 1000);

        const [totalPosts, draftPosts, newPosts] = await Promise.all([
          // 截止该时间点的总文章数
          prisma.post.count({
            where: { createdAt: { lte: date }, deletedAt: null },
          }),
          // 该时间点的草稿数
          prisma.post.count({
            where: {
              createdAt: { lte: date },
              status: "DRAFT",
              deletedAt: null,
            },
          }),
          // 该时间点前24小时新增文章数
          prisma.post.count({
            where: {
              createdAt: {
                gte: oneDayBefore,
                lte: date,
              },
              deletedAt: null,
            },
          }),
        ]);

        return {
          time: date.toISOString(),
          data: {
            total: totalPosts,
            draft: draftPosts,
            new: newPosts,
          },
        };
      }),
    );

    // 过滤出有变化的数据点（只保留 total 或 draft 发生变化的点）
    const trendData: PostTrendItem[] = [];
    let lastTotal = -1;
    let lastDraft = -1;

    for (const item of allTrendData) {
      if (item.data.total !== lastTotal || item.data.draft !== lastDraft) {
        trendData.push(item);
        lastTotal = item.data.total;
        lastDraft = item.data.draft;
      }
    }

    // 确保至少返回第一个和最后一个数据点
    if (trendData.length === 0 && allTrendData.length > 0) {
      const firstItem = allTrendData[0];
      if (firstItem) trendData.push(firstItem);
      if (allTrendData.length > 1) {
        const lastItem = allTrendData[allTrendData.length - 1];
        if (lastItem) trendData.push(lastItem);
      }
    }

    return response.ok({ data: trendData });
  } catch (error) {
    console.error("Get posts trends error:", error);
    return response.serverError();
  }
}

/*
  getPostsList - 获取文章列表
*/
export async function getPostsList(
  params: GetPostsList,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<PostListItem[] | null>>>;
export async function getPostsList(
  params: GetPostsList,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<PostListItem[] | null>>;
export async function getPostsList(
  {
    access_token,
    page = 1,
    pageSize = 25,
    sortBy = "id",
    sortOrder = "desc",
    status,
    search,
  }: GetPostsList,
  serverConfig?: ActionConfig,
): Promise<ActionResult<PostListItem[] | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      page,
      pageSize,
      sortBy,
      sortOrder,
      status,
      search,
    },
    GetPostsListSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 计算偏移量
    const skip = (page - 1) * pageSize;

    // 构建 where 条件
    const where: {
      deletedAt: null;
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      OR?: Array<{
        title?: { contains: string; mode: "insensitive" };
        slug?: { contains: string; mode: "insensitive" };
        excerpt?: { contains: string; mode: "insensitive" };
      }>;
    } = {
      deletedAt: null, // 只获取未删除的文章
    };

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: "insensitive" } },
        { slug: { contains: search.trim(), mode: "insensitive" } },
        { excerpt: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // 获取总数
    const total = await prisma.post.count({ where });

    // 构建排序条件
    const orderBy = { [sortBy]: sortOrder };

    // 获取分页数据
    const posts = await prisma.post.findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        isPinned: true,
        allowComments: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        featuredImage: true,
        metaTitle: true,
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
          },
        },
        tags: {
          select: {
            name: true,
          },
        },
      },
    });

    // 转换数据格式
    const data: PostListItem[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      status: post.status,
      isPinned: post.isPinned,
      allowComments: post.allowComments,
      publishedAt: post.publishedAt?.toISOString() || null,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      featuredImage: post.featuredImage,
      metaTitle: post.metaTitle,
      metaDescription: post.metaDescription,
      metaKeywords: post.metaKeywords,
      robotsIndex: post.robotsIndex,
      author: {
        uid: post.author.uid,
        username: post.author.username,
        nickname: post.author.nickname,
      },
      categories: post.categories.map((cat) => cat.name),
      tags: post.tags.map((tag) => tag.name),
    }));

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
      data,
      meta,
    });
  } catch (error) {
    console.error("Get posts list error:", error);
    return response.serverError();
  }
}

/*
  createPost - 新建文章
*/
export async function createPost(
  params: CreatePost,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<CreatePostResult | null>>>;
export async function createPost(
  params: CreatePost,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<CreatePostResult | null>>;
export async function createPost(
  {
    access_token,
    title,
    slug,
    content,
    excerpt,
    featuredImage,
    status = "DRAFT",
    isPinned = false,
    allowComments = true,
    publishedAt,
    metaTitle,
    metaDescription,
    metaKeywords,
    robotsIndex = true,
    categories,
    tags,
    commitMessage,
  }: CreatePost,
  serverConfig?: ActionConfig,
): Promise<ActionResult<CreatePostResult | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      status,
      isPinned,
      allowComments,
      publishedAt,
      metaTitle,
      metaDescription,
      metaKeywords,
      robotsIndex,
      categories,
      tags,
      commitMessage,
    },
    CreatePostSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 检查 slug 是否已存在
    const existingPost = await prisma.post.findUnique({
      where: { slug },
    });

    if (existingPost) {
      return response.badRequest({ message: "该 slug 已被使用" });
    }

    // 使用 text-version 创建内容版本
    const tv = new TextVersion();
    const now = new Date().toISOString();
    // 如果没有提供 commitMessage，使用默认值
    const finalCommitMessage = commitMessage || "初始版本";
    const versionName = `${user.uid}:${now}:${finalCommitMessage}`;
    const versionedContent = tv.commit("", content, versionName);

    // 处理发布时间
    const publishedAtDate = publishedAt ? new Date(publishedAt) : null;

    // 创建文章
    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content: versionedContent,
        excerpt: excerpt || null,
        featuredImage: featuredImage || null,
        status,
        isPinned,
        allowComments,
        publishedAt: publishedAtDate,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        metaKeywords: metaKeywords || null,
        robotsIndex,
        userUid: user.uid,
        categories:
          categories && categories.length > 0
            ? {
                connectOrCreate: categories.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              }
            : undefined,
        tags:
          tags && tags.length > 0
            ? {
                connectOrCreate: tags.map((name) => ({
                  where: { name },
                  create: { name },
                })),
              }
            : undefined,
      },
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "CREATE",
        resourceType: "POST",
        resourceId: String(post.id),
        vaule: {
          old: null,
          new: {
            title,
            slug,
            status,
            commitMessage,
          },
        },
        description: `创建文章: ${title}`,
        metadata: {
          postId: post.id,
          slug: post.slug,
        },
      },
    });

    return response.ok({
      data: {
        id: post.id,
        slug: post.slug,
      },
    });
  } catch (error) {
    console.error("Create post error:", error);
    return response.serverError();
  }
}

/*
  updatePosts - 批量更新文章
*/
export async function updatePosts(
  params: UpdatePosts,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<{ updated: number } | null>>>;
export async function updatePosts(
  params: UpdatePosts,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ updated: number } | null>>;
export async function updatePosts(
  {
    access_token,
    ids,
    status,
    isPinned,
    allowComments,
    title,
    slug,
    excerpt,
    featuredImage,
    metaTitle,
    metaDescription,
    metaKeywords,
    robotsIndex,
  }: UpdatePosts,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ updated: number } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      ids,
      status,
      isPinned,
      allowComments,
      title,
      slug,
      excerpt,
      featuredImage,
      metaTitle,
      metaDescription,
      metaKeywords,
      robotsIndex,
    },
    UpdatePostsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 构建更新数据
    const updateData: {
      status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
      isPinned?: boolean;
      allowComments?: boolean;
      title?: string;
      slug?: string;
      excerpt?: string;
      featuredImage?: string;
      metaTitle?: string;
      metaDescription?: string;
      metaKeywords?: string;
      robotsIndex?: boolean;
    } = {};

    if (status !== undefined) updateData.status = status;
    if (isPinned !== undefined) updateData.isPinned = isPinned;
    if (allowComments !== undefined) updateData.allowComments = allowComments;
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (excerpt !== undefined) updateData.excerpt = excerpt;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription;
    if (metaKeywords !== undefined) updateData.metaKeywords = metaKeywords;
    if (robotsIndex !== undefined) updateData.robotsIndex = robotsIndex;

    // 如果没有要更新的字段
    if (Object.keys(updateData).length === 0) {
      return response.badRequest({ message: "没有要更新的字段" });
    }

    // 执行批量更新
    const result = await prisma.post.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      data: updateData,
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "UPDATE",
        resourceType: "POST",
        resourceId: ids.join(","),
        vaule: {
          old: null,
          new: updateData,
        },
        description: `批量更新文章: ${ids.length} 篇`,
        metadata: {
          count: result.count,
          idsCount: ids.length,
        },
      },
    });

    return response.ok({
      data: { updated: result.count },
    });
  } catch (error) {
    console.error("Update posts error:", error);
    return response.serverError();
  }
}

/*
  deletePosts - 批量删除文章
*/
export async function deletePosts(
  params: DeletePosts,
  serverConfig: { environment: "serverless" },
): Promise<NextResponse<ApiResponse<{ deleted: number } | null>>>;
export async function deletePosts(
  params: DeletePosts,
  serverConfig?: ActionConfig,
): Promise<ApiResponse<{ deleted: number } | null>>;
export async function deletePosts(
  { access_token, ids }: DeletePosts,
  serverConfig?: ActionConfig,
): Promise<ActionResult<{ deleted: number } | null>> {
  const response = new ResponseBuilder(
    serverConfig?.environment || "serveraction",
  );

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(
    {
      access_token,
      ids,
    },
    DeletePostsSchema,
  );

  if (validationError) return response.badRequest(validationError);

  // 身份验证
  const user = await authVerify({
    allowedRoles: ["ADMIN", "EDITOR", "AUTHOR"],
    accessToken: access_token,
  });

  if (!user) {
    return response.unauthorized();
  }

  try {
    // 软删除：设置 deletedAt 字段
    const result = await prisma.post.updateMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(user.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "DELETE",
        resourceType: "POST",
        resourceId: ids.join(","),
        vaule: {
          old: { ids },
          new: null,
        },
        description: `批量删除文章: ${ids.length} 篇`,
        metadata: {
          count: result.count,
          idsCount: ids.length,
        },
      },
    });

    return response.ok({
      data: { deleted: result.count },
    });
  } catch (error) {
    console.error("Delete posts error:", error);
    return response.serverError();
  }
}
