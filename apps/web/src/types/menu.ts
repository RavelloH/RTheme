/**
 * 菜单项分类
 */
export type MenuCategory = "MAIN" | "COMMON" | "OUTSITE";

/**
 * 客户端使用的精简菜单项定义
 */
export interface MenuItem {
  id: string;
  name: string;
  icon?: string | null;
  link?: string | null;
  slug?: string | null;
  order: number;
  category: MenuCategory;
  page?: {
    slug: string;
  } | null;
}
