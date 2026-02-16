/**
 * 默认菜单数据
 * 定义系统初始化时创建的默认导航菜单
 */

export interface DefaultMenu {
  id: string;
  name: string;
  icon?: string;
  link?: string; // 外部链接
  slug?: string; // 内部路径（如果关联页面，会自动使用页面的 slug）
  status: "ACTIVE" | "SUSPENDED";
  order: number; // 排序顺序
  category: "MAIN" | "COMMON" | "OUTSITE"; // MAIN: 主导航, COMMON: 常用链接, OUTSITE: 外部链接
  pageId?: string; // 关联的页面 ID（可选）
}

/**
 * 默认菜单列表
 * category:
 *   - MAIN: 主导航菜单，显示在顶部
 *   - COMMON: 常用链接，显示在侧边栏
 *   - OUTSITE: 外部链接，显示在页脚或侧边栏底部
 */
export const defaultMenus: DefaultMenu[] = [
  // =====================================
  // 主导航菜单
  // =====================================
  {
    id: "menu-home",
    name: "首页",
    status: "ACTIVE",
    icon: "home-3-fill",
    order: 1,
    category: "MAIN",
    slug: "/",
  },
  {
    id: "menu-projects",
    name: "项目",
    status: "ACTIVE",
    icon: "dashboard-fill",
    order: 2,
    category: "MAIN",
    slug: "projects",
  },
  {
    id: "menu-posts",
    name: "文章",
    status: "ACTIVE",
    icon: "article-fill",
    order: 3,
    category: "MAIN",
    slug: "posts",
  },
  {
    id: "menu-categories",
    name: "分类",
    status: "ACTIVE",
    icon: "folder-fill",
    order: 4,
    category: "MAIN",
    slug: "categories",
  },
  {
    id: "menu-tags",
    name: "标签",
    status: "ACTIVE",
    icon: "price-tag-3-fill",
    order: 5,
    category: "MAIN",
    slug: "tags",
  },
  {
    id: "menu-friends",
    name: "友链",
    status: "ACTIVE",
    icon: "team-fill",
    order: 6,
    category: "MAIN",
    slug: "friends",
  },
  {
    id: "menu-about",
    name: "关于",
    status: "ACTIVE",
    icon: "information-fill",
    order: 7,
    category: "MAIN",
    slug: "about",
  },

  // =====================================
  // 常用链接
  // =====================================
  {
    name: "搜索",
    id: "menu-search",
    icon: "search-fill",
    slug: "search",
    status: "ACTIVE",
    order: 1,
    category: "COMMON",
  },
  {
    name: "照片墙",
    id: "menu-gallery",
    icon: "image-2-fill",
    slug: "gallery",
    status: "ACTIVE",
    order: 2,
    category: "COMMON",
  },
  {
    name: "归档",
    id: "menu-archives",
    icon: "archive-fill",
    slug: "archive",
    status: "ACTIVE",
    order: 3,
    category: "COMMON",
  },
  {
    name: "留言板",
    id: "menus-guestbook",
    icon: "chat-1-fill",
    slug: "guestbook",
    status: "ACTIVE",
    order: 4,
    category: "COMMON",
  },
  {
    name: "站内信",
    id: "menu-internal-messages",
    icon: "message-2-fill",
    slug: "messages",
    status: "ACTIVE",
    order: 5,
    category: "COMMON",
  },
  {
    name: "订阅",
    id: "menu-subscriptions",
    icon: "rss-fill",
    slug: "subscribe",
    status: "ACTIVE",
    order: 6,
    category: "COMMON",
  },
  {
    name: "管理后台",
    id: "menu-admin-dashboard",
    icon: "shield-user-fill",
    slug: "admin",
    status: "ACTIVE",
    order: 7,
    category: "COMMON",
  },
  // =====================================
  // 外部链接
  // =====================================
  {
    name: "GitHub",
    id: "menu-github",
    icon: "github-fill",
    link: "https://github.com/RavelloH/NeutralPress",
    status: "ACTIVE",
    order: 1,
    category: "OUTSITE",
  },
  {
    name: "使用文档",
    id: "menu-documentation",
    icon: "book-2-fill",
    link: "https://neutralpress.net",
    status: "ACTIVE",
    order: 2,
    category: "OUTSITE",
  },
  {
    name: "Demo",
    id: "menu-demo",
    icon: "computer-fill",
    link: "https://ravelloh.com",
    status: "ACTIVE",
    order: 3,
    category: "OUTSITE",
  },
  {
    name: "报告问题",
    id: "menu-rerport",
    icon: "bug-2-fill",
    link: "https://github.com/RavelloH/NeutralPress/issues",
    status: "ACTIVE",
    order: 4,
    category: "OUTSITE",
  },
];
