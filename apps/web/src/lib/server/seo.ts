// SEO 相关库
import type { Metadata } from "next";

import { findCategoryByPath } from "@/lib/server/category-utils";
import { getRawConfig } from "@/lib/server/config-cache";
import prisma from "@/lib/server/prisma";

// 基础静态配置（不依赖数据库的固定值）
const STATIC_METADATA = {
  generator: "NeutralPress",
  referrer: "strict-origin-when-cross-origin" as const,
  classification: "CMS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large" as const,
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon/16x", sizes: "16x16", type: "image/png" },
      { url: "/icon/32x", sizes: "32x32", type: "image/png" },
      { url: "/icon/96x", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/icon/16x",
    apple: [
      { url: "/icon/144x", sizes: "144x144", type: "image/png" },
      { url: "/icon/192x", sizes: "192x192", type: "image/png" },
    ],
    other: [
      { rel: "icon", url: "/icon/48x", sizes: "48x48", type: "image/png" },
      { rel: "icon", url: "/icon/72x", sizes: "72x72", type: "image/png" },
      { rel: "icon", url: "/icon/128x", sizes: "128x128", type: "image/png" },
      { rel: "icon", url: "/icon/256x", sizes: "256x256", type: "image/png" },
      { rel: "icon", url: "/icon/384x", sizes: "384x384", type: "image/png" },
      { rel: "icon", url: "/icon/512x", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  verification: {
    google: "",
    yandex: "",
    yahoo: "",
    other: { me: [""] },
  },
  other: {
    "msapplication-config": "/browserconfig.xml",
    "mobile-web-app-capable": "yes",
  },
};

// SEO配置映射表
const seoConfigMap = {
  metadataBase: "site.url",
  title: "site.title",
  subtitle: "site.subtitle",
  titleTemplate: "site.title.template",
  description: "seo.description",
  applicationName: "site.title",
  keywords: "seo.keywords",
  author: "author.name",
  themeColor: "site.color",
  twitterSite: "seo.twitter_site",
  twitterCreator: "seo.twitter_creator",
  googleVerification: "seo.google_verification",
  category: "seo.category",
  country: "seo.country",
} as const;

// 配置值类型定义
interface ConfigValue {
  default?: string | number | boolean | string[] | null;
  [key: string]: unknown;
}

// 辅助函数：获取字符串配置值
function getStringValue(
  configValue: ConfigValue | undefined,
  fallback: string = "",
): string {
  return typeof configValue?.default === "string"
    ? configValue.default
    : fallback;
}

// 辅助函数：获取字符串数组配置值
function getStringArrayValue(
  configValue: ConfigValue | undefined,
  fallback: string[] = [],
): string[] {
  const value = configValue?.default;
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",").map((k) => k.trim());
  return fallback;
}

/**
 * 解析标题模板
 * 模板格式: {pageTitle} | {title}( - {subtitle})
 * - {pageTitle}: 页面标题（如果有）
 * - {title}: 站点标题
 * - {subtitle}: 站点子标题
 * - (): 括号及其内部内容在 subtitle 为空时会被移除
 *
 * @param template 标题模板字符串
 * @param title 站点标题
 * @param subtitle 站点子标题（可选）
 * @param pageTitle 页面标题（可选）
 * @returns 解析后的标题字符串
 */
function parseTitleTemplate(
  template: string,
  title: string,
  subtitle?: string,
  pageTitle?: string,
): string {
  let result = template;

  // 如果没有子标题，移除所有括号及其内容
  if (!subtitle || subtitle.trim() === "") {
    result = result.replace(/\([^)]*\)/g, "");
  }

  // 替换占位符
  result = result
    .replace(/\{pageTitle\}/g, pageTitle || "")
    .replace(/\{title\}/g, title)
    .replace(/\{subtitle\}/g, subtitle || "")
    // 移除括号（如果还有的话）
    .replace(/[()]/g, "")
    // 清理多余的空格和分隔符
    .replace(/\s+-\s+$/g, "")
    .replace(/^\s+-\s+/g, "")
    .replace(/\|\s+$/g, "")
    .replace(/^\s+\|/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return result;
}

/**
 * 生成 Next.js Metadata 的标题对象
 * 如果提供了模板，返回 { template, default } 格式
 * 否则返回简单的字符串或 undefined
 */
function generateTitleMetadata(
  template: string | undefined,
  title: string,
  subtitle?: string,
): { template: string; default: string } | string | undefined {
  if (!title) return undefined;

  // 如果有模板，生成标题对象
  if (template) {
    // 将 {pageTitle} 替换为 %s 以符合 Next.js 格式
    const nextjsTemplate = template.replace(/\{pageTitle\}/g, "%s");

    return {
      template: parseTitleTemplate(nextjsTemplate, title, subtitle, "%s"),
      default: parseTitleTemplate(template, title, subtitle),
    };
  }

  // 没有模板时，如果有子标题则拼接
  if (subtitle && subtitle.trim() !== "") {
    return `${title} - ${subtitle}`;
  }

  return title;
}

// 扩展的 Metadata 类型，支持分页
interface ExtendedMetadata extends Metadata {
  pagination?: {
    next?: string;
    prev?: string;
  };
}

// 生成动态SEO配置的异步函数
export async function generateMetadata(
  overrides: Partial<ExtendedMetadata> = {},
  options?: { pathname?: string; seoParams?: SeoTemplateParams },
): Promise<Metadata> {
  // 批量获取所有需要的配置
  const configKeys = Object.values(seoConfigMap);
  const configs = await Promise.all(configKeys.map((key) => getRawConfig(key)));

  // 构建配置映射
  const configValues = Object.fromEntries(
    configKeys.map((key, index) => [
      key,
      configs[index]?.value as ConfigValue | undefined,
    ]),
  ) as Record<string, ConfigValue | undefined>;

  // 动态获取的值
  const url = getStringValue(configValues[seoConfigMap.metadataBase]);
  const title = getStringValue(configValues[seoConfigMap.title]);
  const subtitle = getStringValue(configValues[seoConfigMap.subtitle]);
  const titleTemplate = getStringValue(
    configValues[seoConfigMap.titleTemplate],
  );
  const description = getStringValue(configValues[seoConfigMap.description]);
  const appName = getStringValue(configValues[seoConfigMap.applicationName]);
  const keywords = getStringArrayValue(configValues[seoConfigMap.keywords]);
  const author = getStringValue(configValues[seoConfigMap.author]);
  const twitterSite = getStringValue(configValues[seoConfigMap.twitterSite]);
  const twitterCreator = getStringValue(
    configValues[seoConfigMap.twitterCreator],
  );
  const googleVerification = getStringValue(
    configValues[seoConfigMap.googleVerification],
  );
  const category = getStringValue(configValues[seoConfigMap.category]);
  const country = getStringValue(configValues[seoConfigMap.country]);

  // 生成标题元数据
  const titleMetadata = generateTitleMetadata(
    titleTemplate,
    title || "NeutralPress",
    subtitle,
  );

  // 构建最终的metadata
  const dynamicMetadata: Metadata = {
    metadataBase: url ? new URL(url) : undefined,
    title: titleMetadata,
    description: description || undefined,
    applicationName: appName || title || undefined,
    ...STATIC_METADATA,
    authors: author ? [{ name: author }] : undefined,
    creator: author || undefined,
    publisher: author || undefined,
    category: category || undefined,
    alternates: {
      ...STATIC_METADATA.alternates,
      canonical: options?.pathname || "/",
    },
    openGraph: {
      type: "website",
      locale: "zh-CN",
      title: titleMetadata,
      description: description || undefined,
      siteName: appName || title || undefined,
      url: url || undefined,
      countryName: country || undefined,
      images: title
        ? [
            {
              url: "/og-image.png",
              width: 1200,
              height: 630,
              alt: `${title}${subtitle ? ` - ${subtitle}` : ""} - ${description || ""}`,
              type: "image/png",
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      site: twitterSite || undefined,
      creator: twitterCreator || undefined,
      title: titleMetadata,
      description: description || undefined,
      images: title
        ? {
            url: "/twitter-card.png",
            alt: `${title}${subtitle ? ` - ${subtitle}` : ""} Twitter Card`,
            width: 1200,
            height: 630,
          }
        : undefined,
    },
    verification: {
      ...STATIC_METADATA.verification,
      google: googleVerification || undefined,
    },
    keywords: keywords.length > 0 ? keywords : undefined,
    appleWebApp: {
      capable: true,
      title: appName || title || undefined,
      statusBarStyle: "black-translucent",
    },
    other: {
      ...STATIC_METADATA.other,
      ...(appName || title
        ? {
            "apple-mobile-web-app-title": appName || title,
            "application-name": appName || title,
          }
        : {}),
    },
  };

  // 处理页面级别的标题覆盖
  const processedOverrides = { ...overrides };

  // SEO 插值处理：如果提供了 seoParams，自动对 title 和 description 进行插值
  if (options?.seoParams) {
    // 检查 title 是否包含占位符
    if (typeof overrides.title === "string" && overrides.title.includes("{")) {
      processedOverrides.title = await interpolateSeoTemplate(
        overrides.title,
        options.seoParams,
      );
    }

    // 检查 description 是否包含占位符
    if (
      typeof overrides.description === "string" &&
      overrides.description.includes("{")
    ) {
      processedOverrides.description = await interpolateSeoTemplate(
        overrides.description,
        options.seoParams,
      );
    }
  }

  // 如果提供了分页信息，添加到 other 中以生成正确的 link 标签
  if (overrides.pagination) {
    const { pagination, ...overridesWithoutPagination } = overrides;

    const otherMetadata: Record<string, string | number | (string | number)[]> =
      {
        ...processedOverrides.other,
      };

    if (pagination.prev) {
      otherMetadata.prev = pagination.prev;
    }

    if (pagination.next) {
      otherMetadata.next = pagination.next;
    }

    processedOverrides.other = otherMetadata;
    Object.assign(processedOverrides, overridesWithoutPagination);
  }

  // 如果覆盖参数中包含标题，确保使用模板格式
  // 注意：这里使用 processedOverrides.title，因为可能已经经过了 SEO 插值
  if (processedOverrides.title) {
    // 如果是对象格式，保持原样（允许页面完全控制标题）
    if (typeof processedOverrides.title === "object") {
      // 已经是最终格式，不需要处理
    } else if (typeof processedOverrides.title === "string") {
      // 如果是字符串标题，应用站点标题模板
      if (titleTemplate) {
        processedOverrides.title = parseTitleTemplate(
          titleTemplate,
          title || "NeutralPress",
          subtitle,
          processedOverrides.title,
        );
      } else {
        // 没有模板时使用简单拼接
        const siteTitle = title || "NeutralPress";
        const fullTitle = subtitle ? `${siteTitle} - ${subtitle}` : siteTitle;
        processedOverrides.title = `${processedOverrides.title} | ${fullTitle}`;
      }
    }
  }

  return {
    ...dynamicMetadata,
    ...processedOverrides,
  };
}

/**
 * 插值页面模板
 * 支持使用插值器数据（如 {tagName}, {page}, {totalPage} 等）来动态生成标题和描述
 *
 * @param template 模板字符串，如 "标签：{tagName} - 第{page}页"
 * @param data 插值器数据对象
 * @returns 插值后的字符串
 */
export function interpolatePageTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  let result = template;

  // 替换所有占位符
  for (const [key, value] of Object.entries(data)) {
    const placeholder = `{${key}}`;
    if (result.includes(placeholder)) {
      const valueStr =
        value === null || value === undefined ? "" : String(value);
      result = result.split(placeholder).join(valueStr);
    }
  }

  return result;
}

// ========== SEO 专用插值体系 ==========

/**
 * SEO 插值参数
 */
export interface SeoTemplateParams {
  slug?: string;
  page?: number;
  pageSize?: number;
}

/**
 * 检测模板中使用的占位符
 * 只返回模板中实际存在的占位符，避免不必要的数据库查询
 */
function detectPlaceholders(
  template: string,
): Set<keyof SeoTemplateData | string> {
  const placeholderRegex = /\{([^}]+)\}/g;
  const placeholders = new Set<string>();

  let match;
  while ((match = placeholderRegex.exec(template)) !== null) {
    if (match[1]) {
      placeholders.add(match[1]);
    }
  }

  return placeholders;
}

/**
 * SEO 插值数据
 */
interface SeoTemplateData {
  slug?: string;
  page?: number;
  totalPage?: number;
  tag?: string;
  tagDescription?: string;
  category?: string;
  categoryDescription?: string;
}

/**
 * 获取标签信息（按需查询）
 */
async function fetchTagData(
  slug: string | undefined,
  placeholders: Set<string>,
): Promise<{ tag?: string; tagDescription?: string }> {
  if (!slug) return {};

  // 只有当模板中包含 {tag} 或 {tagDescription} 时才查询
  const needsTag = placeholders.has("tag");
  const needsDescription = placeholders.has("tagDescription");

  if (!needsTag && !needsDescription) return {};

  try {
    const tag = await prisma.tag.findUnique({
      where: { slug },
      select: { name: true, description: true },
    });

    if (!tag) return {};

    return {
      tag: needsTag ? tag.name : undefined,
      tagDescription: needsDescription
        ? tag.description || undefined
        : undefined,
    };
  } catch (error) {
    console.error("[SEO] Failed to fetch tag data:", error);
    return {};
  }
}

/**
 * 获取分类信息（按需查询）
 */
async function fetchCategoryData(
  slug: string | undefined,
  placeholders: Set<string>,
): Promise<{ category?: string; categoryDescription?: string }> {
  if (!slug) return {};

  // 只有当模板中包含 {category} 或 {categoryDescription} 时才查询
  const needsCategory = placeholders.has("category");
  const needsDescription = placeholders.has("categoryDescription");

  if (!needsCategory && !needsDescription) return {};

  try {
    // 解析路径并查找分类（支持嵌套路径如 "xue-shu/shu-xue"）
    const pathSlugs = slug.split("/").filter(Boolean);
    const category = pathSlugs.length > 0 ? await findCategoryByPath(pathSlugs) : null;

    if (!category) return {};

    return {
      category: needsCategory ? category.name : undefined,
      categoryDescription: needsDescription
        ? category.description || undefined
        : undefined,
    };
  } catch (error) {
    console.error("[SEO] Failed to fetch category data:", error);
    return {};
  }
}

/**
 * 计算总页数（按需计算）
 */
async function calculateTotalPage(
  slug: string | undefined,
  pageSize: number = 20,
  placeholders: Set<string>,
): Promise<number | undefined> {
  // 只有当模板中包含 {totalPage} 时才计算
  if (!placeholders.has("totalPage")) return undefined;

  if (!slug) return undefined;

  try {
    let totalCount = 0;

    // 根据占位符自动判断页面类型
    const isTagPage =
      placeholders.has("tag") || placeholders.has("tagDescription");
    const isCategoryPage =
      placeholders.has("category") || placeholders.has("categoryDescription");

    if (isTagPage) {
      // 查询标签下的文章数
      const tag = await prisma.tag.findUnique({
        where: { slug },
        select: {
          _count: {
            select: {
              posts: {
                where: {
                  status: "PUBLISHED",
                  deletedAt: null,
                },
              },
            },
          },
        },
      });
      totalCount = tag?._count.posts || 0;
    } else if (isCategoryPage) {
      // 查询分类下的文章数（支持嵌套路径）
      const pathSlugs = slug.split("/").filter(Boolean);
      const category = pathSlugs.length > 0 ? await findCategoryByPath(pathSlugs) : null;

      if (!category) {
        return 0;
      }

      // 查询分类及其所有子孙分类的文章数
      const { getAllDescendantIds } = await import("@/lib/server/category-utils");
      const descendantIds = await getAllDescendantIds(category.id);
      const allIds = [category.id, ...descendantIds];

      // 统计文章数
      totalCount = await prisma.post.count({
        where: {
          categories: {
            some: {
              id: { in: allIds },
            },
          },
          status: "PUBLISHED",
          deletedAt: null,
        },
      });
    }

    if (totalCount === 0) return 0;

    // 计算总页数
    return Math.ceil(totalCount / pageSize);
  } catch (error) {
    console.error("[SEO] Failed to calculate total page:", error);
    return undefined;
  }
}

/**
 * SEO 专用模板插值函数
 *
 * 支持的变量：
 * - {slug} - 路由参数中的 slug
 * - {page} - 当前页码
 * - {totalPage} - 总页数（通过数据库计数计算）
 * - {tag} - 标签名称（仅当模板包含此占位符时查询）
 * - {tagDescription} - 标签描述（仅当模板包含此占位符时查询）
 * - {category} - 分类名称（仅当模板包含此占位符时查询）
 * - {categoryDescription} - 分类描述（仅当模板包含此占位符时查询）
 *
 * @param template 模板字符串
 * @param params SEO 插值参数
 * @returns 插值后的字符串
 */
export async function interpolateSeoTemplate(
  template: string,
  params: SeoTemplateParams,
): Promise<string> {
  if (!template) return "";

  // 检测模板中使用的占位符
  const placeholders = detectPlaceholders(template);

  // 如果没有任何占位符，直接返回原模板
  if (placeholders.size === 0) return template;

  // 准备基础数据
  const data: SeoTemplateData = {
    slug: params.slug,
    page: params.page,
  };

  // 并行执行所有需要的数据查询（按需）
  const [tagData, categoryData, totalPage] = await Promise.all([
    fetchTagData(params.slug, placeholders),
    fetchCategoryData(params.slug, placeholders),
    calculateTotalPage(params.slug, params.pageSize, placeholders),
  ]);

  // 合并数据
  Object.assign(data, tagData, categoryData);
  if (totalPage !== undefined) {
    data.totalPage = totalPage;
  }

  // 执行插值
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    const placeholder = `{${key}}`;
    if (result.includes(placeholder)) {
      result = result.split(placeholder).join(String(value));
    }
  }

  return result;
}
