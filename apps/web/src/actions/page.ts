"use server";
import { NextResponse } from "next/server";
import {
  GetPagesStatsSchema,
  GetPagesStats,
  PagesStatsData,
  GetPagesListSchema,
  GetPagesList,
  PageListItem,
  GetPageDetailSchema,
  GetPageDetail,
  PageDetail,
  CreatePageSchema,
  CreatePage,
  CreatePageResult,
  UpdatePageSchema,
  UpdatePage,
  UpdatePageResult,
  UpdatePagesSchema,
  UpdatePages,
  DeletePagesSchema,
  DeletePages,
} from "@repo/shared-types/api/page";
import { ApiResponse, ApiResponseData } from "@repo/shared-types/api/common";
import ResponseBuilder from "@/lib/server/response";
import limitControl from "@/lib/server/rateLimit";
import { headers } from "next/headers";
import { validateData } from "@/lib/server/validator";
import prisma from "@/lib/server/prisma";
import { authVerify } from "@/lib/server/auth-verify";
import { logAuditEvent } from "./audit";
import { getClientIP, getClientUserAgent } from "@/lib/server/getClientInfo";
import { slugify } from "@/lib/server/slugify";

/*
    getPagesStats() - 获取页面统计信息
*/
export async function getPagesStats(params: GetPagesStats) {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetPagesStatsSchema);
  if (validationError) {
    return response.badRequest({ error: validationError.error });
  }

  // 验证用户身份（仅管理员）
  const authResult = await authVerify({
    accessToken: params.access_token,
    allowedRoles: ["ADMIN"],
  });
  if (!authResult) {
    return response.unauthorized({ message: "需要管理员权限" });
  }

  try {
    // 获取页面统计数据
    const [totalStats, statusStats, systemPageStats] = await Promise.all([
      // 总数统计
      prisma.page.count({
        where: {
          deletedAt: null,
        },
      }),
      // 状态统计
      prisma.page.groupBy({
        by: ["status"],
        where: {
          deletedAt: null,
        },
        _count: {
          status: true,
        },
      }),
      // 系统页面统计
      prisma.page.groupBy({
        by: ["isSystemPage"],
        where: {
          deletedAt: null,
        },
        _count: {
          isSystemPage: true,
        },
      }),
    ]);

    // 统计各状态数量
    const statusCounts = statusStats.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 统计系统/自定义页面数量
    const systemCounts = systemPageStats.reduce(
      (acc, item) => {
        acc[item.isSystemPage ? "system" : "custom"] = item._count.isSystemPage;
        return acc;
      },
      {} as Record<string, number>,
    );

    const statsData: PagesStatsData = {
      updatedAt: new Date().toISOString(),
      cache: false, // 实时查询
      total: {
        total: totalStats,
        active: statusCounts.ACTIVE || 0,
        suspended: statusCounts.SUSPENDED || 0,
        system: systemCounts.system || 0,
        custom: systemCounts.custom || 0,
      },
    };

    return response.ok({ data: statsData });
  } catch (error) {
    console.error("获取页面统计失败:", error);
    return response.serverError({ message: "获取页面统计失败" });
  }
}

/*
    getPagesList() - 获取页面列表
*/
export async function getPagesList(params: GetPagesList) {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetPagesListSchema);
  if (validationError) {
    return response.badRequest({ error: validationError.error });
  }

  // 验证用户身份（仅管理员）
  const authResult = await authVerify({
    accessToken: params.access_token,
    allowedRoles: ["ADMIN"],
  });
  if (!authResult) {
    return response.unauthorized({ message: "需要管理员权限" });
  }

  try {
    const {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      status,
      isSystemPage,
      robotsIndex,
      createdAtStart,
      createdAtEnd,
      updatedAtStart,
      updatedAtEnd,
    } = params;

    // 构建查询条件
    const where: any = {
      deletedAt: null,
    };

    // 搜索条件
    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { slug: { contains: search.trim() } },
        { excerpt: { contains: search.trim() } },
      ];
    }

    // 状态筛选
    if (status && status.length > 0) {
      where.status = { in: status };
    }

    // 系统页面筛选
    if (isSystemPage && isSystemPage.length > 0) {
      where.isSystemPage = { in: isSystemPage };
    }

    // 搜索引擎索引筛选
    if (robotsIndex && robotsIndex.length > 0) {
      where.robotsIndex = { in: robotsIndex };
    }

    // 创建时间范围筛选
    if (createdAtStart || createdAtEnd) {
      where.createdAt = {};
      if (createdAtStart) {
        where.createdAt.gte = new Date(createdAtStart);
      }
      if (createdAtEnd) {
        where.createdAt.lte = new Date(createdAtEnd);
      }
    }

    // 更新时间范围筛选
    if (updatedAtStart || updatedAtEnd) {
      where.updatedAt = {};
      if (updatedAtStart) {
        where.updatedAt.gte = new Date(updatedAtStart);
      }
      if (updatedAtEnd) {
        where.updatedAt.lte = new Date(updatedAtEnd);
      }
    }

    // 获取分页数据
    const [pages, total] = await Promise.all([
      prisma.page.findMany({
        where,
        orderBy: {
          [sortBy || "id"]: sortOrder || "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: {
            select: {
              uid: true,
              username: true,
              nickname: true,
            },
          },
        },
      }),
      prisma.page.count({ where }),
    ]);

    // 转换数据格式
    const pageList: PageListItem[] = pages.map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      status: page.status,
      contentType: page.contentType,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
      author: page.author || {
        uid: null,
        username: null,
        nickname: null,
      },
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      robotsIndex: page.robotsIndex,
      isSystemPage: page.isSystemPage,
      config: page.config,
    }));

    // 构建分页信息
    const meta = {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page < Math.ceil(total / pageSize),
      hasPrev: page > 1,
    };

    return response.ok({
      data: pageList,
      meta,
    });
  } catch (error) {
    console.error("获取页面列表失败:", error);
    return response.serverError({ message: "获取页面列表失败" });
  }
}

/*
    getPageDetail() - 获取页面详情
*/
export async function getPageDetail(params: GetPageDetail) {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, GetPageDetailSchema);
  if (validationError) {
    return response.badRequest({ error: validationError.error });
  }

  // 验证用户身份（仅管理员）
  const authResult = await authVerify({
    accessToken: params.access_token,
    allowedRoles: ["ADMIN"],
  });
  if (!authResult) {
    return response.unauthorized({ message: "需要管理员权限" });
  }

  try {
    // 获取页面详情
    const page = await prisma.page.findFirst({
      where: {
        slug: params.slug,
        deletedAt: null,
      },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    if (!page) {
      return response.notFound({ message: "页面不存在" });
    }

    const pageDetail: PageDetail = {
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content,
      contentType: page.contentType,
      status: page.status,
      createdAt: page.createdAt.toISOString(),
      updatedAt: page.updatedAt.toISOString(),
      author: page.author || {
        uid: null,
        username: null,
        nickname: null,
      },
      config: page.config,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      robotsIndex: page.robotsIndex,
      isSystemPage: page.isSystemPage,
    };

    return response.ok({ data: pageDetail });
  } catch (error) {
    console.error("获取页面详情失败:", error);
    return response.serverError({ message: "获取页面详情失败" });
  }
}

/*
    createPage() - 创建页面
*/
export async function createPage(params: CreatePage) {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, CreatePageSchema);
  if (validationError) {
    return response.badRequest({ error: validationError.error });
  }

  // 验证用户身份（仅管理员）
  const authResult = await authVerify({
    accessToken: params.access_token,
    allowedRoles: ["ADMIN"],
  });
  if (!authResult) {
    return response.unauthorized({ message: "需要管理员权限" });
  }

  try {
    const {
      title,
      slug,
      content,
      contentType,
      excerpt,
      config,
      status,
      metaTitle,
      metaDescription,
      metaKeywords,
      robotsIndex,
      isSystemPage,
    } = params;

    // 检查 slug 是否已存在
    const existingPage = await prisma.page.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    if (existingPage) {
      return response.conflict({ message: "Slug 已存在" });
    }

    // 创建页面
    const newPage = await prisma.page.create({
      data: {
        title,
        slug,
        content: content || "",
        contentType,
        config,
        status,
        metaTitle,
        metaDescription,
        metaKeywords,
        robotsIndex,
        isSystemPage,
        userUid: authResult.uid,
      },
    });

    const result: CreatePageResult = {
      id: newPage.id,
      slug: newPage.slug,
    };

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(authResult.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "CREATE",
        resourceType: "PAGE",
        resourceId: newPage.id,
        vaule: {
          old: null,
          new: {
            id: newPage.id,
            title,
            slug,
            status,
            isSystemPage,
          },
        },
        description: `创建页面: ${title}`,
        metadata: {
          pageId: newPage.id,
          slug,
          isSystemPage,
        },
      },
    });

    return response.created({ data: result });
  } catch (error) {
    console.error("创建页面失败:", error);
    return response.serverError({ message: "创建页面失败" });
  }
}

/*
    updatePage() - 更新单个页面
*/
export async function updatePage(params: UpdatePage) {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, UpdatePageSchema);
  if (validationError) {
    return response.badRequest({ error: validationError.error });
  }

  // 验证用户身份（仅管理员）
  const authResult = await authVerify({
    accessToken: params.access_token,
    allowedRoles: ["ADMIN"],
  });
  if (!authResult) {
    return response.unauthorized({ message: "需要管理员权限" });
  }

  try {
    const slug = params.slug;
    const { access_token, ...updateData } = params;

    // 获取原始页面
    const originalPage = await prisma.page.findFirst({
      where: {
        slug,
        deletedAt: null,
      },
    });

    if (!originalPage) {
      return response.notFound({ message: "页面不存在" });
    }

    // 检查是否为系统页面，系统页面不允许修改某些字段
    if (originalPage.isSystemPage) {
      // 系统页面不允许修改 isSystemPage 字段
      if ("isSystemPage" in updateData) {
        delete updateData.isSystemPage;
      }
    }

    // 如果要修改 slug，检查新 slug 是否已存在
    if (updateData.newSlug && updateData.newSlug !== slug) {
      const existingPage = await prisma.page.findFirst({
        where: {
          slug: updateData.newSlug,
          id: { not: originalPage.id },
          deletedAt: null,
        },
      });

      if (existingPage) {
        return response.conflict({ message: "新 Slug 已存在" });
      }

      (updateData as any).slug = updateData.newSlug;
      delete updateData.newSlug;
    }

    // 移除 undefined 值
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    // 更新页面
    const updatedPage = await prisma.page.update({
      where: {
        id: originalPage.id,
      },
      data: updateData,
    });

    const result: UpdatePageResult = {
      id: updatedPage.id,
      slug: updatedPage.slug,
    };

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(authResult.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "UPDATE",
        resourceType: "PAGE",
        resourceId: originalPage.id,
        vaule: {
          old: {
            slug: originalPage.slug,
            title: originalPage.title,
            // 其他旧值
          },
          new: {
            slug: updatedPage.slug,
            title: updatedPage.title,
            // 其他新值
          },
        },
        description: `更新页面: ${updatedPage.title}`,
        metadata: {
          pageId: originalPage.id,
          originalSlug: slug,
          newSlug: updatedPage.slug,
          fieldsModifiedCount: Object.keys(updateData).length,
        },
      },
    });

    return response.ok({ data: result });
  } catch (error) {
    console.error("更新页面失败:", error);
    return response.serverError({ message: "更新页面失败" });
  }
}

/*
    updatePages() - 批量更新页面
*/
export async function updatePages(params: UpdatePages) {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, UpdatePagesSchema);
  if (validationError) {
    return response.badRequest({ error: validationError.error });
  }

  // 验证用户身份（仅管理员）
  const authResult = await authVerify({
    accessToken: params.access_token,
    allowedRoles: ["ADMIN"],
  });
  if (!authResult) {
    return response.unauthorized({ message: "需要管理员权限" });
  }

  try {
    const { ids, ...updateData } = params;

    // 移除 undefined 值
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    // 如果是批量操作，跳过系统页面
    let targetIds = ids;
    if (Object.keys(updateData).length > 0) {
      const systemPages = await prisma.page.findMany({
        where: {
          id: { in: ids },
          isSystemPage: true,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (systemPages.length > 0) {
        // 过滤掉系统页面
        const systemPageIds = systemPages.map((p) => p.id);
        targetIds = ids.filter((id) => !systemPageIds.includes(id));

        if (targetIds.length === 0) {
          return response.badRequest({
            message: "选中的页面都是系统页面，无法批量修改",
          });
        }
      }
    }

    // 执行批量更新
    const result = await prisma.page.updateMany({
      where: {
        id: { in: targetIds },
        deletedAt: null,
      },
      data: updateData,
    });

    // 记录审计日志
    await logAuditEvent({
      user: {
        uid: String(authResult.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "UPDATE",
        resourceType: "PAGE",
        resourceId: targetIds.join(","),
        vaule: {
          old: {},
          new: updateData,
        },
        description: `批量更新页面: ${result.count} 个`,
        metadata: {
          count: result.count,
          targetIdsCount: targetIds.length,
          fieldsModifiedCount: Object.keys(updateData).length,
        },
      },
    });

    return response.ok({
      data: {
        updated: result.count,
      },
    });
  } catch (error) {
    console.error("批量更新页面失败:", error);
    return response.serverError({ message: "批量更新页面失败" });
  }
}

/*
    deletePages() - 批量删除页面
*/
export async function deletePages(params: DeletePages) {
  const response = new ResponseBuilder("serveraction");

  if (!(await limitControl(await headers()))) {
    return response.tooManyRequests();
  }

  const validationError = validateData(params, DeletePagesSchema);
  if (validationError) {
    return response.badRequest({ error: validationError.error });
  }

  // 验证用户身份（仅管理员）
  const authResult = await authVerify({
    accessToken: params.access_token,
    allowedRoles: ["ADMIN"],
  });
  if (!authResult) {
    return response.unauthorized({ message: "需要管理员权限" });
  }

  try {
    const { ids } = params;

    // 检查是否包含系统页面
    const systemPages = await prisma.page.findMany({
      where: {
        id: { in: ids },
        isSystemPage: true,
        deletedAt: null,
      },
      select: { id: true, title: true },
    });

    if (systemPages.length > 0) {
      const systemPageTitles = systemPages.map((p) => p.title).join("、");
      return response.badRequest({
        message: `无法删除系统页面：${systemPageTitles}`,
      });
    }

    // 软删除页面
    const result = await prisma.page.updateMany({
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
        uid: String(authResult.uid),
        ipAddress: await getClientIP(),
        userAgent: await getClientUserAgent(),
      },
      details: {
        action: "DELETE",
        resourceType: "PAGE",
        resourceId: ids.join(","),
        vaule: {
          old: {
            deletedIds: ids,
            deletedCount: result.count,
          },
          new: null,
        },
        description: `批量删除页面: ${result.count} 个`,
        metadata: {
          count: result.count,
          idsCount: ids.length,
        },
      },
    });

    return response.ok({
      data: {
        deleted: result.count,
      },
    });
  } catch (error) {
    console.error("删除页面失败:", error);
    return response.serverError({ message: "删除页面失败" });
  }
}
