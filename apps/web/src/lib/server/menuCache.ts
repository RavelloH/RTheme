import fs from "fs";
import path from "path";

// 菜单项类型定义
export interface MenuItem {
  id: string;
  name: string;
  icon?: string | null;
  link?: string | null;
  slug?: string | null;
  status: "ACTIVE" | "SUSPENDED";
  order: number;
  category: "MAIN" | "COMMON" | "OUTSITE";
  createdAt: Date;
  updatedAt: Date;
  page?: PageItem | null;
}

// 页面项类型定义
export interface PageItem {
  id: string;
  title: string;
  slug: string;
  content: unknown;
  config?: unknown | null;
  excerpt?: string | null;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  userUid?: number | null;
}

// 缓存文件路径
const CACHE_FILE_PATH = path.join(process.cwd(), ".cache", ".menu-cache.json");

/**
 * 获取菜单项列表
 * 在开发环境中直接从数据库读取
 * 在生产环境中从缓存文件读取
 */
export async function getMenus(): Promise<MenuItem[]> {
  if (process.env.NODE_ENV === "production") {
    return getMenusFromCache();
  } else {
    return getMenusFromDatabase();
  }
}

/**
 * 从数据库获取菜单项（包含关联的页面信息）
 */
async function getMenusFromDatabase(): Promise<MenuItem[]> {
  try {
    const { default: prisma } = await import("./prisma");

    const menus = await prisma.menu.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      include: {
        page: true,
      },
    });

    return menus.map(
      (menu: {
        id: string;
        name: string;
        icon?: string | null;
        link?: string | null;
        slug?: string | null;
        status: "ACTIVE" | "SUSPENDED";
        order: number;
        category: "MAIN" | "COMMON" | "OUTSITE";
        createdAt: Date;
        updatedAt: Date;
        page?: {
          id: string;
          title: string;
          slug: string;
          content: unknown;
          config?: unknown | null;
          excerpt?: string | null;
          status: "DRAFT" | "ACTIVE" | "SUSPENDED";
          createdAt: Date;
          updatedAt: Date;
          isDefault: boolean;
          metaTitle?: string | null;
          metaDescription?: string | null;
          metaKeywords?: string | null;
          userUid?: number | null;
        } | null;
      }) => ({
        id: menu.id,
        name: menu.name,
        icon: menu.icon,
        link: menu.link,
        slug: menu.slug,
        status: menu.status,
        order: menu.order,
        category: menu.category,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
        page: menu.page
          ? {
              id: menu.page.id,
              title: menu.page.title,
              slug: menu.page.slug,
              content: menu.page.content,
              config: menu.page.config,
              excerpt: menu.page.excerpt,
              status: menu.page.status,
              createdAt: menu.page.createdAt,
              updatedAt: menu.page.updatedAt,
              isDefault: menu.page.isDefault,
              metaTitle: menu.page.metaTitle,
              metaDescription: menu.page.metaDescription,
              metaKeywords: menu.page.metaKeywords,
              userUid: menu.page.userUid,
            }
          : null,
      }),
    );
  } catch (error) {
    console.error("从数据库获取菜单失败:", error);
    return [];
  }
}

/**
 * 从缓存文件获取菜单项
 */
function getMenusFromCache(): MenuItem[] {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      console.warn("菜单缓存文件不存在:", CACHE_FILE_PATH);
      return [];
    }

    const cacheData = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const menus: MenuItem[] = JSON.parse(cacheData);

    // 确保所有日期都是 Date 对象
    return menus.map((menu) => ({
      ...menu,
      createdAt: new Date(menu.createdAt),
      updatedAt: new Date(menu.updatedAt),
      page: menu.page
        ? {
            ...menu.page,
            createdAt: new Date(menu.page.createdAt),
            updatedAt: new Date(menu.page.updatedAt),
          }
        : null,
    }));
  } catch (error) {
    console.error("从缓存文件读取菜单失败:", error);
    return [];
  }
}

/**
 * 按分类获取菜单项
 */
export async function getMenusByCategory(
  category: "MAIN" | "COMMON" | "OUTSITE",
): Promise<MenuItem[]> {
  const allMenus = await getMenus();
  return allMenus.filter((menu) => menu.category === category);
}

/**
 * 获取活跃的菜单项
 */
export async function getActiveMenus(): Promise<MenuItem[]> {
  const allMenus = await getMenus();
  return allMenus.filter((menu) => menu.status === "ACTIVE");
}

/**
 * 按分类获取活跃的菜单项
 */
export async function getActiveMenusByCategory(
  category: "MAIN" | "COMMON" | "OUTSITE",
): Promise<MenuItem[]> {
  const allMenus = await getMenus();
  return allMenus.filter(
    (menu) => menu.category === category && menu.status === "ACTIVE",
  );
}
