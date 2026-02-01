import "server-only";

import fs from "fs";
import { unstable_cache } from "next/cache";
import path from "path";

import type { BlockConfig } from "@/blocks/core/types";

// 自定义 JSON 类型定义（避免与 Prisma 的 JsonValue 冲突）
type CustomJsonValue =
  | string
  | number
  | boolean
  | null
  | CustomJsonObject
  | CustomJsonArray;
type CustomJsonObject = { [key: string]: CustomJsonValue };
type CustomJsonArray = CustomJsonValue[];

// 页面组件类型定义
export interface PageComponent {
  id: string;
  value:
    | {
        header?: string;
        content?: string;
        description?: string;
      }
    | {
        content: string[];
        footer?: {
          link: string;
          description: string;
        };
      };
  description: string;
}

// 系统页面配置类型定义
export interface SystemPageConfig {
  blocks?: BlockConfig[];
  components?: PageComponent[];
}

// 通用页面配置类型（可以是任何 JSON 值）
type PageConfig = SystemPageConfig | CustomJsonObject | CustomJsonValue;

// 页面对象类型定义
export interface PageItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentType: "MARKDOWN" | "HTML" | "MDX";
  config: PageConfig;
  status: "ACTIVE" | "SUSPENDED";
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isSystemPage: boolean;
  metaDescription: string | null;
  metaKeywords: string | null;
  robotsIndex: boolean;
  userUid: number | null;
}

// 缓存文件路径
const CACHE_FILE_PATH = path.join(process.cwd(), ".cache", ".page-cache.json");

/**
 * 获取原始页面项
 * - 如果缓存文件存在，从缓存文件读取（构建阶段）
 * - 否则使用 unstable_cache 从数据库读取（开发/生产环境）
 */
export async function getRawPage(slug: string): Promise<PageItem | null> {
  // 如果缓存文件存在，从缓存读取（构建阶段）
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const page = getPageFromCache(slug);
    if (page) {
      return page;
    }
  }

  // 缓存文件不存在或未找到页面，使用 unstable_cache 从数据库读取
  const getCachedData = unstable_cache(
    async (s: string) => {
      return await getPageFromDatabase(s);
    },
    [`page-${slug}`],
    {
      tags: ["pages", `pages/${slug}`],
      revalidate: false,
    },
  );

  return await getCachedData(slug);
}

/**
 * 通过 ID 获取原始页面项
 */
export async function getRawPageById(id: string): Promise<PageItem | null> {
  // 如果缓存文件存在，从缓存读取（构建阶段）
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const page = getPageByIdFromCache(id);
    if (page) {
      return page;
    }
  }

  // 缓存文件不存在或未找到页面，使用 unstable_cache 从数据库读取
  const getCachedData = unstable_cache(
    async (pageId: string) => {
      return await getPageByIdFromDatabase(pageId);
    },
    [`page-id-${id}`],
    {
      tags: ["pages", `pages/${id}`],
      revalidate: false,
    },
  );

  return await getCachedData(id);
}

/**
 * 获取页面配置值的辅助函数
 */
async function getPageConfigValue(
  slug: string,
  defaultValue?: unknown,
  field?: string,
): Promise<unknown> {
  const page = await getRawPage(slug);

  // 如果页面不存在,返回默认值
  if (!page?.config) {
    return defaultValue;
  }

  const pageConfig = page.config;

  // 如果指定了字段名且配置值是对象,尝试获取指定字段
  if (field && typeof pageConfig === "object" && pageConfig !== null) {
    return (pageConfig as CustomJsonObject)[field] ?? defaultValue;
  }

  // 如果配置值是对象,返回整个对象
  if (typeof pageConfig === "object" && pageConfig !== null) {
    return pageConfig;
  }

  // 返回配置值本身
  return pageConfig;
}

/**
 * 获取页面配置(带泛型支持)
 * @param slug 页面 slug
 * @param defaultValue 默认值
 * @param field 可选的字段名,用于从对象配置中获取特定字段
 * @returns 配置值
 */
export async function getPageConfig<T = unknown>(
  slug: string,
  defaultValue?: T,
  field?: string,
): Promise<T> {
  const value = await getPageConfigValue(slug, defaultValue, field);
  return value as T;
}

/**
 * 获取系统页面配置（类型安全）
 * @param page 页面对象（来自 getRawPage 的结果）
 * @returns 系统页面配置对象
 */
export function getSystemPageConfig(
  page: PageItem | null,
): SystemPageConfig | null {
  if (!page?.config || typeof page.config !== "object") {
    return null;
  }

  // 检查是否为 SystemPageConfig 类型
  const config = page.config as CustomJsonObject;

  if (config.blocks || config.components) {
    return {
      blocks: config.blocks as BlockConfig[] | undefined,
      components: config.components as PageComponent[] | undefined,
    };
  }

  return null;
}

/**
 * 从数据库获取页面
 */
async function getPageFromDatabase(slug: string): Promise<PageItem | null> {
  try {
    const { default: prisma } = await import("./prisma");
    const page = await prisma.page.findUnique({
      where: {
        slug,
        deletedAt: null, // 确保不返回已删除的页面
      },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    if (!page) {
      return null;
    }

    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content,
      contentType: page.contentType as "MARKDOWN" | "HTML" | "MDX",
      config: page.config as PageConfig,
      status: page.status as "ACTIVE" | "SUSPENDED",
      deletedAt: page.deletedAt,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      isSystemPage: page.isSystemPage,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      robotsIndex: page.robotsIndex,
      userUid: page.userUid,
    };
  } catch (error) {
    console.error("从数据库获取页面失败:", error);
    return null;
  }
}

/**
 * 从数据库通过 ID 获取页面
 */
async function getPageByIdFromDatabase(id: string): Promise<PageItem | null> {
  try {
    const { default: prisma } = await import("./prisma");
    const page = await prisma.page.findUnique({
      where: {
        id,
        deletedAt: null, // 确保不返回已删除的页面
      },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    if (!page) {
      return null;
    }

    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content,
      contentType: page.contentType as "MARKDOWN" | "HTML" | "MDX",
      config: page.config as PageConfig,
      status: page.status as "ACTIVE" | "SUSPENDED",
      deletedAt: page.deletedAt,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      isSystemPage: page.isSystemPage,
      metaDescription: page.metaDescription,
      metaKeywords: page.metaKeywords,
      robotsIndex: page.robotsIndex,
      userUid: page.userUid,
    };
  } catch (error) {
    console.error("从数据库获取页面失败:", error);
    return null;
  }
}

/**
 * 从缓存文件获取页面
 */
function getPageFromCache(slug: string): PageItem | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      console.warn("页面缓存文件不存在:", CACHE_FILE_PATH);
      return null;
    }

    const cacheData = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const pages: Record<string, PageItem> = JSON.parse(cacheData);

    const page = pages[slug];
    if (!page) {
      return null;
    }

    // 确保 updatedAt 和 deletedAt 是 Date 对象
    return {
      ...page,
      deletedAt: page.deletedAt ? new Date(page.deletedAt) : null,
      createdAt: new Date(page.createdAt),
      updatedAt: new Date(page.updatedAt),
    };
  } catch (error) {
    console.error("从缓存文件读取页面失败:", error);
    return null;
  }
}

/**
 * 从缓存文件通过 ID 获取页面
 */
function getPageByIdFromCache(id: string): PageItem | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      console.warn("页面缓存文件不存在:", CACHE_FILE_PATH);
      return null;
    }

    const cacheData = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const pages: Record<string, PageItem> = JSON.parse(cacheData);

    // 通过 ID 查找页面
    const page = Object.values(pages).find((p) => p.id === id);
    if (!page) {
      return null;
    }

    // 确保 updatedAt 和 deletedAt 是 Date 对象
    return {
      ...page,
      deletedAt: page.deletedAt ? new Date(page.deletedAt) : null,
      createdAt: new Date(page.createdAt),
      updatedAt: new Date(page.updatedAt),
    };
  } catch (error) {
    console.error("从缓存文件读取页面失败:", error);
    return null;
  }
}

/**
 * 获取所有活跃页面（主要用于客户端）
 * 只返回 ACTIVE 状态且未删除的页面
 */
export async function getAllActivePages(): Promise<Record<string, PageItem>> {
  // 如果缓存文件存在，从缓存读取（构建阶段）
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const allPages = getAllPagesFromCache();
    if (Object.keys(allPages).length > 0) {
      return filterActivePages(allPages);
    }
  }

  // 缓存文件不存在或为空，使用 unstable_cache 从数据库读取
  const getCachedData = unstable_cache(
    async () => {
      const allPages = await getAllPagesFromDatabase();
      return filterActivePages(allPages);
    },
    ["all-active-pages"],
    {
      tags: ["pages"],
      revalidate: false,
    },
  );

  return await getCachedData();
}

/**
 * 过滤活跃页面
 * 只返回 ACTIVE 状态且未删除的页面
 */
function filterActivePages(
  pages: Record<string, PageItem>,
): Record<string, PageItem> {
  const filteredPages: Record<string, PageItem> = {};

  Object.entries(pages).forEach(([slug, page]) => {
    // 跳过已删除、非活跃状态的页面
    if (page.deletedAt || page.status !== "ACTIVE") {
      return;
    }

    filteredPages[slug] = page;
  });

  return filteredPages;
}

/**
 * 从数据库获取所有页面
 */
async function getAllPagesFromDatabase(): Promise<Record<string, PageItem>> {
  try {
    const { default: prisma } = await import("./prisma");
    const pages = await prisma.page.findMany({
      where: {
        deletedAt: null, // 不返回已删除的页面
      },
      orderBy: { title: "asc" },
      include: {
        author: {
          select: {
            uid: true,
            username: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    });

    const result: Record<string, PageItem> = {};

    pages.forEach(
      (page: {
        id: string;
        title: string;
        slug: string;
        content: string;
        contentType: string;
        config: unknown;
        status: string;
        deletedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        isSystemPage: boolean;
        metaDescription: string | null;
        metaKeywords: string | null;
        robotsIndex: boolean;
        userUid: number | null;
      }) => {
        result[page.slug] = {
          id: page.id,
          title: page.title,
          slug: page.slug,
          content: page.content,
          contentType: page.contentType as "MARKDOWN" | "HTML" | "MDX",
          config: page.config as PageConfig,
          status: page.status as "ACTIVE" | "SUSPENDED",
          deletedAt: page.deletedAt,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          isSystemPage: page.isSystemPage,
          metaDescription: page.metaDescription,
          metaKeywords: page.metaKeywords,
          robotsIndex: page.robotsIndex,
          userUid: page.userUid,
        };
      },
    );

    return result;
  } catch (error) {
    console.error("从数据库获取所有页面失败:", error);
    return {};
  }
}

/**
 * 从缓存文件获取所有页面
 */
function getAllPagesFromCache(): Record<string, PageItem> {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      console.warn("页面缓存文件不存在:", CACHE_FILE_PATH);
      return {};
    }

    const cacheData = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const pages: Record<string, PageItem> = JSON.parse(cacheData);

    // 确保所有日期字段都是 Date 对象
    const result: Record<string, PageItem> = {};

    Object.entries(pages).forEach(([slug, page]) => {
      result[slug] = {
        ...page,
        deletedAt: page.deletedAt ? new Date(page.deletedAt) : null,
        createdAt: new Date(page.createdAt),
        updatedAt: new Date(page.updatedAt),
      };
    });

    return result;
  } catch (error) {
    console.error("从缓存文件读取所有页面失败:", error);
    return {};
  }
}

/**
 * 根据状态获取页面
 */
export async function getPagesByStatus(
  status: "ACTIVE" | "SUSPENDED",
): Promise<Record<string, PageItem>> {
  // 如果缓存文件存在，从缓存读取（构建阶段）
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const allPages = getAllPagesFromCache();
    if (Object.keys(allPages).length > 0) {
      const filteredPages: Record<string, PageItem> = {};

      Object.entries(allPages).forEach(([slug, page]) => {
        // 跳过已删除的页面
        if (page.deletedAt) {
          return;
        }

        // 只返回指定状态的页面
        if (page.status === status) {
          filteredPages[slug] = page;
        }
      });

      return filteredPages;
    }
  }

  // 缓存文件不存在或为空，使用 unstable_cache 从数据库读取
  const getCachedData = unstable_cache(
    async (s: "ACTIVE" | "SUSPENDED") => {
      const allPages = await getAllPagesFromDatabase();
      const filteredPages: Record<string, PageItem> = {};

      Object.entries(allPages).forEach(([slug, page]) => {
        // 跳过已删除的页面
        if (page.deletedAt) {
          return;
        }

        // 只返回指定状态的页面
        if (page.status === s) {
          filteredPages[slug] = page;
        }
      });

      return filteredPages;
    },
    [`pages-by-status-${status}`],
    {
      tags: ["pages"],
      revalidate: false,
    },
  );

  return await getCachedData(status);
}

/**
 * 获取系统页面
 */
export async function getSystemPages(): Promise<Record<string, PageItem>> {
  // 如果缓存文件存在，从缓存读取（构建阶段）
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const allPages = getAllPagesFromCache();
    if (Object.keys(allPages).length > 0) {
      const systemPages: Record<string, PageItem> = {};

      Object.entries(allPages).forEach(([slug, page]) => {
        // 跳过已删除、非活跃状态、非系统页面的页面
        if (page.deletedAt || page.status !== "ACTIVE" || !page.isSystemPage) {
          return;
        }

        systemPages[slug] = page;
      });

      return systemPages;
    }
  }

  // 缓存文件不存在或为空，使用 unstable_cache 从数据库读取
  const getCachedData = unstable_cache(
    async () => {
      const allPages = await getAllPagesFromDatabase();
      const systemPages: Record<string, PageItem> = {};

      Object.entries(allPages).forEach(([slug, page]) => {
        // 跳过已删除、非活跃状态、非系统页面的页面
        if (page.deletedAt || page.status !== "ACTIVE" || !page.isSystemPage) {
          return;
        }

        systemPages[slug] = page;
      });

      return systemPages;
    },
    ["system-pages"],
    {
      tags: ["pages"],
      revalidate: false,
    },
  );

  return await getCachedData();
}

/**
 * 获取用户创建的页面
 */
export async function getPagesByUser(
  userUid: number,
): Promise<Record<string, PageItem>> {
  // 如果缓存文件存在，从缓存读取（构建阶段）
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const allPages = getAllPagesFromCache();
    if (Object.keys(allPages).length > 0) {
      const userPages: Record<string, PageItem> = {};

      Object.entries(allPages).forEach(([slug, page]) => {
        // 跳过已删除的页面和系统页面
        if (page.deletedAt || page.isSystemPage) {
          return;
        }

        // 只返回指定用户的页面
        if (page.userUid === userUid) {
          userPages[slug] = page;
        }
      });

      return userPages;
    }
  }

  // 缓存文件不存在或为空，使用 unstable_cache 从数据库读取
  const getCachedData = unstable_cache(
    async (uid: number) => {
      const allPages = await getAllPagesFromDatabase();
      const userPages: Record<string, PageItem> = {};

      Object.entries(allPages).forEach(([slug, page]) => {
        // 跳过已删除的页面和系统页面
        if (page.deletedAt || page.isSystemPage) {
          return;
        }

        // 只返回指定用户的页面
        if (page.userUid === uid) {
          userPages[slug] = page;
        }
      });

      return userPages;
    },
    [`pages-by-user-${userUid}`],
    {
      tags: ["pages"],
      revalidate: false,
    },
  );

  return await getCachedData(userUid);
}

/**
 * 获取 block 的动态 areas
 * 根据 header 和 footer 的存在情况动态调整 areas
 * - 如果存在 header，就不包含 area 1
 * - 如果存在 footer，就不包含 area 12
 * - 否则就是 [1,...,12]
 *
 * @param hasHeader 是否存在 header
 * @param hasFooter 是否存在 footer
 * @returns areas 数组
 */
export function getBlocksAreas(
  _: number, // @deprecated 保留参数以兼容旧接口
  hasHeader: boolean,
  hasFooter: boolean,
): (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12)[] {
  if (hasHeader && hasFooter) {
    return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }

  if (hasHeader) {
    return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  }

  if (hasFooter) {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }

  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

/**
 * 从配置对象中获取指定 ID 的 block
 */
export function getPageBlock(
  config: SystemPageConfig | null,
  blockId: number | string,
): BlockConfig | null {
  if (!config?.blocks) {
    return null;
  }

  const block = config.blocks.find(
    (block) => String(block.id) === String(blockId),
  );
  return block || null;
}

/**
 * 从配置对象中获取指定 ID 的 component
 */
export function getPageComponent(
  config: SystemPageConfig | null,
  componentId: string,
): PageComponent | null {
  if (!config?.components) {
    return null;
  }

  const component = config.components.find(
    (component) => component.id === componentId,
  );
  return component || null;
}

/**
 * 获取 block 的字段值 (支持新结构)
 */
export function getPageBlockValue<T = unknown>(
  config: SystemPageConfig | null,
  blockId: number | string,
  fieldPath: string,
  defaultValue?: T,
): T | null {
  const block = getPageBlock(config, blockId);

  if (!block) {
    return defaultValue ?? null;
  }

  try {
    const pathParts = fieldPath.split(".");
    let currentValue: unknown = block.content;

    for (const part of pathParts) {
      if (
        currentValue &&
        typeof currentValue === "object" &&
        part in currentValue
      ) {
        currentValue = (currentValue as Record<string, unknown>)[part];
      } else {
        return defaultValue ?? null;
      }
    }

    return currentValue as T;
  } catch (error) {
    console.error(`获取页面 block 字段值失败: ${fieldPath}`, error);
    return defaultValue ?? null;
  }
}

/**
 * 获取 component 的字段值
 */
export function getPageComponentValue<T = unknown>(
  config: SystemPageConfig | null,
  componentId: string,
  fieldPath: string,
  defaultValue?: T,
): T | null {
  const component = getPageComponent(config, componentId);

  if (!component) {
    return defaultValue ?? null;
  }

  try {
    const pathParts = fieldPath.split(".");
    let currentValue: unknown = component.value;

    for (const part of pathParts) {
      if (
        currentValue &&
        typeof currentValue === "object" &&
        part in currentValue
      ) {
        currentValue = (currentValue as Record<string, unknown>)[part];
      } else {
        return defaultValue ?? null;
      }
    }

    return currentValue as T;
  } catch (error) {
    console.error(`获取页面 component 字段值失败: ${fieldPath}`, error);
    return defaultValue ?? null;
  }
}

/**
 * 页面配置构建器类
 */
export class PageConfigBuilder {
  constructor(private config: SystemPageConfig | null) {}

  getBlock(blockId: number | string) {
    return getPageBlock(this.config, blockId);
  }

  getBlockValue<T = unknown>(
    blockId: number | string,
    fieldPath: string,
    defaultValue?: T,
  ): T | null {
    return getPageBlockValue(this.config, blockId, fieldPath, defaultValue);
  }

  getComponentValue<T = unknown>(
    componentId: string,
    fieldPath: string,
    defaultValue?: T,
  ): T | null {
    return getPageComponentValue(
      this.config,
      componentId,
      fieldPath,
      defaultValue,
    );
  }

  // === 快捷方法 (适配新数据结构) ===

  getBlockTitle(blockId: number | string, defaultValue: string = ""): string {
    return (
      this.getBlockValue<string>(blockId, "title", defaultValue) ?? defaultValue
    );
  }

  getBlockHeader(blockId: number | string, defaultValue: string = ""): string {
    return (
      this.getBlockValue<string>(blockId, "header", defaultValue) ??
      defaultValue
    );
  }

  getBlockContent(
    blockId: number | string,
    field: "top" | "bottom" = "top",
    defaultValue: string[] = [],
  ): string[] {
    return (
      this.getBlockValue<string[]>(blockId, `content.${field}`, defaultValue) ??
      defaultValue
    );
  }

  getBlockFooterLink(
    blockId: number | string,
    defaultValue: string = "",
  ): string {
    return (
      this.getBlockValue<string>(blockId, "footer.link", defaultValue) ??
      defaultValue
    );
  }

  getBlockFooterText(
    blockId: number | string,
    defaultValue: string = "",
  ): string {
    return (
      this.getBlockValue<string>(blockId, "footer.text", defaultValue) ??
      defaultValue
    );
  }

  /**
   * 快捷获取 block 的底部描述 (别名，兼容旧代码)
   */
  getBlockFooterDesc(
    blockId: number | string,
    defaultValue: string = "",
  ): string {
    return this.getBlockFooterText(blockId, defaultValue);
  }

  /**
   * 检查指定 block 是否存在
   */
  isBlockEnabled(blockId: number | string): boolean {
    const block = this.getBlock(blockId);
    return !!block;
  }
}

export function createPageConfigBuilder(
  config: SystemPageConfig | null,
): PageConfigBuilder {
  return new PageConfigBuilder(config);
}
