// apps/web/src/data/default-pages.ts
// 默认页面数据定义

import type { AllBlockConfigs } from "@/blocks/core/types/base";

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

// 页面配置接口
export interface PageConfig {
  blocks?: AllBlockConfigs[];
  [key: string]: unknown;
}

export interface DefaultPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentType?: "MARKDOWN" | "HTML" | "MDX" | "BLOCK" | "BUILDIN";
  config?: PageConfig;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  // SEO 字段
  metaDescription?: string;
  metaKeywords?: string;
  robotsIndex?: boolean;
  // 系统字段
  isSystemPage?: boolean;
}

/**
 * 默认页面列表
 */
export const defaultPages: DefaultPage[] = [
  {
    id: "system-home",
    title: "首页",
    slug: "/",
    content: "",
    contentType: "BLOCK",
    config: {
      blocks: [
        {
          id: 100,
          block: "hero",
          description: "",
          content: {
            logoImage: "",
            galleryImages: "",
            galleryImageFilter: "dark",
            galleryImagesOrigin: "latestPosts",
          },
        },
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            header: { value: "Welcome. I'm...", align: "left" },
            title: { value: "NeutralPress | 中性色", align: "left" },
            content: {
              top: {
                value: [
                  "专为博客而打造的CMS系统。",
                  "独特的横板滚动布局，",
                  "完整的后台管理功能，",
                  "便捷的可视化编辑器，",
                  "方便的媒体管理面板，",
                  "强大的内置访问统计，",
                  "经济的无服务器模式，",
                  "可靠的系统安全防御。",
                ],
                align: "left",
              },
              bottom: {
                value: ["共有文章 {posts} 篇，", "收录项目 {projects} 件。"],
                align: "left",
              },
            },
            footer: {
              link: "/about",
              text: "Learn more about me",
            },
          },
        },
        {
          id: 101,
          block: "projects",
          description: "",
          content: {
            worksSummary: {
              footer: {
                link: "/projects",
                text: "View more projects",
              },
              content: [
                "不止这些。",
                "想要查看更多？",
                "前往我的 Github 来查看我的所有项目，",
                "或者在 Projects 页面看看相关描述。",
                "",
                "Github: [@xxx](https://github.com/username)",
              ],
            },
            worksDescription: {
              header: {
                align: "left",
                value: "My main tech stack includes",
              },
              content:
                "React / Next.js / TypeScript / JavaScript / TailwindCSS / Node.js / Express.js / Serverless / GraphQL / PostgreSQL / MySQL / Redis / Docker / Kubernetes / Webpack / Vite / C / C++ / C# / Jest / Cypress / Shell ...",
            },
            title: {
              line1: "PROJECTS",
              line2: "项目",
            },
            projects: {
              sort: "publishedAt_desc",
              onlyWithCover: false,
            },
          },
        },
        {
          id: 102,
          block: "posts",
          description: "",
          content: {
            footer: {
              description: "共 {posts} 篇文章",
              title: "查看全部文章",
              link: "/posts",
            },
            title: {
              line1: "POSTS",
              line2: "文章 ",
            },
            layout: {
              columns: "2",
            },
            posts: {
              sort: "publishedAt_desc",
              onlyWithCover: false,
              showPinned: true,
            },
          },
        },
        {
          id: 103,
          block: "tags-categories",
          description: "",
          content: {
            footer: {
              text: ["Tags &", "CATEGORIES"],
            },
          },
        },
        {
          id: 4,
          block: "default",
          description: "",
          content: {
            header: { value: "Want to...", align: "left" },
            title: { value: "Contact me / 联系我", align: "left" },
            content: {
              top: {
                value: [
                  "学习交流?",
                  "洽谈合作?",
                  "交个朋友?",
                  "......",
                  "欢迎通过邮箱联系我：",
                  "xxx@example.com",
                ],
                align: "left",
              },
              bottom: {
                value: [
                  "或者，不用那么正式，",
                  "直接使用下方的站内信系统和我聊聊。",
                ],
                align: "left",
              },
            },
            footer: {
              link: "/messages?uid=1",
              text: "Start chatting with me",
            },
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription:
      "NeutralPress 是专为博客和内容创作者设计的现代化CMS系统，提供完整的内容管理、发布和分析功能",
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-projects-page",
    title: "项目",
    slug: "/projects",
    content: "",
    contentType: "BLOCK",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            title: {
              value: "Projects / 项目",
            },
            footer: {
              text: "随便看看",
              type: "random",
            },
            header: {
              value: "Works. Crafts. Labs.",
            },
            content: {
              top: {
                value: [
                  "记录 & 索引所有项目。",
                  "",
                  "共收录 {projects} 个项目。",
                  "更多项目，请前往我的 [Github 主页](https://github.com/username) 查看。 ",
                ],
              },
              bottom: {
                value: ["当前正在查看 项目列表。"],
              },
            },
            layout: {
              verticalCenter: false,
            },
            showSearchBar: false,
            dataSource: "projects-index",
          },
        },
        {
          id: 2,
          block: "featured-projects",
          description: "",
          content: {
            projects: {
              count: 3,
              onlyFeatured: true,
            },
          },
        },
        {
          id: 3,
          block: "divider",
          description: "",
          content: {
            text: "\\- explore more -",
            color: "accent",
            style: "text",
            backgroundColor: "background",
          },
        },
        {
          id: 4,
          block: "projects-list",
          description: "",
          content: {
            projects: {
              sort: "publishedAt_desc",
              limit: 0,
              showFeatured: false,
            },
            filterBy: "all",
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "展示个人和团队的项目项目集，包含项目、商业案例和技术实践",
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-posts-page",
    title: "文章 - 第 {page} 页",
    slug: "/posts/page/:page",
    content: "",
    contentType: "BLOCK",
    config: {
      pageSize: 20,
      blocks: [
        {
          id: 1,
          block: "default",
          content: {
            title: {
              align: "left",
              value: "Posts / 文章",
            },
            footer: {
              link: "",
              text: "随便看看 / RANDOM",
              type: "random",
            },
            header: {
              align: "left",
              value: "Thoughts. Notes. Stories.",
            },
            content: {
              top: {
                align: "left",
                value: [
                  "记录 & 索引所有文章。",
                  "",
                  "最近更新于 {lastPublishDays}。",
                  "自 {firstPublishAt} 以来，共索引 {posts} 篇文章。",
                ],
              },
              bottom: {
                align: "left",
                value: [
                  "第 {postsListPage} 页，共 {postsListTotalPage} 页。",
                  "正在查看第 {postsListFirstPage} - {postsListLastPage} 篇文章。",
                ],
              },
            },
            showSearchBar: true,
            dataSource: "posts-index",
          },
          description: "",
        },
        {
          id: 2,
          block: "paged-posts",
          content: {
            searchable: true,
            filterBy: "all",
            sortBy: "isPinned_desc",
            pageSize: 20,
          },
          description: "",
        },
        {
          id: 3,
          block: "pagination",
          content: {
            filterBy: "all",
          },
          description: "",
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "分享技术见解、开发经验和行业思考的博客文章",
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-categories-index",
    title: "分类",
    slug: "/categories",
    content: "",
    contentType: "BLOCK",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          content: {
            title: {
              align: "left",
              value: "Categories / 分类",
            },
            footer: {
              text: "Random / 随便看看",
              type: "random",
            },
            header: {
              align: "left",
              value: "Topics. Themes. Paths.",
            },
            content: {
              top: {
                align: "left",
                value: [
                  "整理 & 索引所有分类。",
                  "",
                  "最近更新于 {lastPublishDays}。",
                  "共索引 {categories} 个分类，",
                  "其中包含 {rootCategories} 个根分类，{childCategories} 个子分类。",
                ],
              },
              bottom: {
                align: "left",
                value: ["当前正在查看 {pageInfo|page=category-index}。"],
              },
            },
            dataSource: "categories-index",
          },
          description: "",
        },
        {
          id: 2,
          block: "accordion",
          description: "",
          content: {
            source: "categories",
            layout: {
              sortBy: "count",
            },
            limit: 0,
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "按主题和领域分类整理的文章列表，方便快速找到感兴趣的内容",
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-child-categories",
    title: "分类：{category} - 第 {page} 页",
    slug: "/categories/:slug.../page/:page",
    content: "",
    contentType: "BLOCK",
    metaDescription:
      "浏览分类 {category} 下的文章，第 {page} 页，共 {totalPage} 页",
    config: {
      pageSize: 20,
      blocks: [
        {
          id: 1,
          block: "default",
          content: {
            title: {
              align: "left",
              value: "分类：{category}",
            },
            footer: {
              link: "",
              text: "Back / 返回上一级分类",
              type: "back",
            },
            header: {
              align: "left",
              value: "Topics. Themes. Paths.",
            },
            content: {
              top: {
                align: "left",
                value: [
                  "整理 & 索引 {category} 下的所有子分类及文章。",
                  "",
                  "最近更新于 {lastPublishDays}。",
                  "此分类共包含 {categorySubcategoryCount} 个子分类，",
                  "{categoryPostCount} 篇文章。",
                ],
              },
              bottom: {
                align: "left",
                value: [
                  "当前正在查看 {pageInfo|page=category-detail}。",
                  "第 {categoryPage} 页，共 {categoryTotalPage} 页。",
                  "正在查看第 {categoryFirstPage} - {categoryLastPage} 篇文章。",
                ],
              },
            },
            dataSource: "category-detail",
          },
          description: "",
        },
        {
          id: 2,
          block: "projects-list",
          description: "",
          content: {
            filterBy: "category",
            projects: {
              limit: 0,
            },
          },
        },
        {
          id: 3,
          block: "accordion",
          content: {
            source: "child-categories",
          },
          description: "",
        },
        {
          id: 4,
          block: "paged-posts",
          description: "",
          content: {
            filterBy: "category",
          },
        },
        {
          id: 5,
          block: "pagination",
          content: {
            filterBy: "category",
          },
          description: "",
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-tags-index",
    title: "标签",
    slug: "/tags",
    content: "",
    contentType: "BLOCK",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          content: {
            title: {
              align: "left",
              value: "Tags / 标签",
            },
            footer: {
              link: "",
              text: "Random / 随便看看",
              type: "random",
            },
            header: {
              align: "left",
              value: "Keywords. Connections. Traces.",
            },
            layout: {
              verticalCenter: false,
            },
            content: {
              top: {
                align: "left",
                value: [
                  "整理 & 索引所有标签。",
                  "",
                  "最近更新于 {lastPublishDays}。",
                  "共索引 {tags} 个标签。",
                ],
              },
              bottom: {
                align: "left",
                value: ["当前正在查看 {pageInfo|page=tag-index}。"],
              },
            },
            dataSource: "tags-index",
          },
          description: "",
        },
        {
          id: 2,
          block: "accordion",
          content: {
            source: "tags",
            layout: {
              sortBy: "count",
            },
            limit: 0,
          },
          description: "",
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "通过标签快速发现相关文章，标签云展示内容的分布和热点话题",
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-child-tags",
    title: "标签：{tag} - 第 {page} 页",
    slug: "/tags/:slug/page/:page",
    content: "",
    contentType: "BLOCK",
    metaDescription: "浏览标签 {tag} 下的文章，第 {page} 页，共 {totalPage} 页",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          content: {
            title: {
              align: "left",
              value: "标签：{tag}",
            },
            footer: {
              link: "",
              text: "Back / 返回标签列表",
              type: "back",
            },
            header: {
              align: "left",
              value: "Keywords. Connections. Traces.",
            },
            content: {
              top: {
                align: "left",
                value: [
                  "{tagDescription}",
                  "整理 & 索引 {tag} 下的所有文章。",
                  "此标签共包含 {tagPostCount} 个文章。",
                ],
              },
              bottom: {
                align: "left",
                value: [
                  "当前正在查看 {pageInfo|page=tag-detail}。",
                  "第 {tagPage} 页，共 {tagTotalPage} 页。",
                  "正在查看第 {tagFirstPage} - {tagLastPage} 篇文章。",
                ],
              },
            },
            layout: {
              verticalCenter: false,
              ratio: 1,
            },
            dataSource: "tag-detail",
          },
          description: "",
        },
        {
          id: 2,
          block: "projects-list",
          description: "",
          content: {
            filterBy: "tag",
            projects: {
              limit: 0,
            },
          },
        },
        {
          id: 3,
          block: "paged-posts",
          content: {
            filterBy: "tag",
            sortBy: "isPinned_desc",
            pageSize: 20,
          },
          description: "",
        },
        {
          id: 4,
          block: "pagination",
          content: {
            filterBy: "tag",
          },
          description: "",
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-friends-page",
    title: "友链",
    slug: "/friends",
    content: "",
    contentType: "BLOCK",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            title: {
              value: "Friends / 友情链接",
            },
            footer: {
              link: "/friends/new",
              text: "申请 / 管理友链",
              type: "normal",
            },
            header: {
              value: "Nodes. Hubs. Links.",
            },
            layout: {
              ratio: 1,
            },
            content: {
              top: {
                value: [
                  "收录 & 联结所有连接。",
                  "",
                  "共收录 {friends} 个友情链接，",
                  "欢迎交换友链，点击下方链接即可自助申请。",
                ],
              },
              bottom: {
                value: ["当前正在查看 友链列表。"],
              },
            },
          },
        },
        {
          id: 2,
          block: "friend-links",
          description: "",
          content: {
            limit: 0,
            random: true,
          },
        },
        {
          id: 3,
          block: "divider",
          description: "",
          content: {
            text: "\\- Broken Links -",
            color: "accent",
            style: "text",
          },
        },
        {
          id: 4,
          block: "invalid-friend-links",
          description: "",
          content: {
            limit: 0,
            showAsLink: false,
            showDuration: true,
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription:
      "推荐的优秀网站、技术博客和合作伙伴，包含高质量的技术资源和创意项目",
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-about-page",
    title: "关于",
    slug: "/about",
    content: "",
    contentType: "BLOCK",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          content: {
            title: { value: "About / 关于" },
            footer: { link: "/", text: "这里可以放链接", type: "normal" },
            header: { value: "Profile. Identity. Self." },
            layout: { verticalCenter: false },
            content: {
              top: {
                value: ["你好，我是 xxx 。", "欢迎来到 xxxxxx，…………", ""],
              },
              bottom: { value: ["（随便你怎么写）"] },
            },
          },
          description: "",
        },
        {
          id: 2,
          block: "author",
          content: {
            bio: ["在这里写一段简介吧"],
            name: "User Name",
            title: "职位 / 头衔",
            avatar: "",
          },
          description: "",
        },
        {
          id: 3,
          block: "divider",
          content: {
            text: "\\- Find me -",
            color: "accent",
            style: "text",
            backgroundColor: "background",
          },
          description: "",
        },
        {
          id: 4,
          block: "social-links",
          content: {
            qq: "#",
            vk: "#",
            rss: "https://example.com/feed.xml",
            kick: "#",
            line: "#",
            xbox: "#",
            xing: "#",
            email: "mailto:me@example.com",
            figma: "#",
            gitee: "#",
            npmjs: "#",
            skype: "#",
            slack: "#",
            steam: "#",
            vimeo: "#",
            weibo: "#",
            yuque: "#",
            zcool: "#",
            zhihu: "#",
            disqus: "#",
            douban: "#",
            fiverr: "#",
            flickr: "#",
            footer: "",
            github: "#",
            gitlab: "#",
            header: "",
            layout: { rows: 4 },
            medium: "#",
            notion: "#",
            reddit: "#",
            tiktok: "#",
            trello: "#",
            tumblr: "#",
            twitch: "#",
            upwork: "#",
            vercel: "#",
            wechat: "#",
            behance: "#",
            blogger: "#",
            bluesky: "#",
            codepen: "#",
            discord: "#",
            dropbox: "#",
            gitbook: "#",
            patreon: "#",
            spotify: "#",
            threads: "#",
            twitter: "#",
            website: "https://example.com",
            youtube: "#",
            bilibili: "#",
            dribbble: "#",
            facebook: "#",
            linkedin: "#",
            mastodon: "#",
            pixelfed: "#",
            snapchat: "#",
            spectrum: "#",
            telegram: "#",
            unsplash: "#",
            whatsapp: "#",
            fediverse: "#",
            friendica: "#",
            instagram: "#",
            kakaoTalk: "#",
            messenger: "#",
            pinterest: "#",
            wordpress: "#",
            soundcloud: "#",
            stackshare: "#",
            playstation: "#",
            productHunt: "#",
            neteaseMusic: "#",
            stackOverflow: "#",
            switchNintendo: "#",
            wechatChannels: "#",
          },
          description: "这里放的都是展示用的，请改成你自己的用户名",
        },
        {
          id: 5,
          block: "divider",
          content: {
            text: "\\- LEARN MORE -",
            color: "accent",
            style: "text",
            backgroundColor: "background",
          },
          description: "",
        },
        {
          id: 6,
          block: "quote",
          content: {
            quote: "这里可以放一些名人名言，\n或者干脆是你说的。",
            author: "—— 我",
            layout: { align: "center" },
            source: "《我说的》",
          },
          description: "",
        },
        {
          id: 7,
          block: "divider",
          content: {
            icon: "dot",
            text: "\\- my friends -",
            color: "accent",
            style: "text",
          },
          description: "",
        },
        {
          id: 8,
          block: "testimonial",
          content: {
            role: "可能是朋友",
            quote: "说的太对了",
            role2: "应该是路人",
            author: "不愿透露姓名的朋友",
            layout: { background: "default", enableDualRow: true },
            quote2: "是这样的",
            author2: "一般经过的路人",
          },
          description: "",
        },
        {
          id: 9,
          block: "testimonial",
          content: {
            role: "大概是开发者",
            quote: "有点意思",
            role2: "或许是神奇海螺",
            author: "普通的开发者",
            layout: { background: "default", enableDualRow: true },
            quote2: "为什么不问问神奇海螺呢",
            author2: "神奇海螺",
          },
          description: "",
        },
        {
          id: 10,
          block: "divider",
          content: { text: "\\- timeline -", color: "accent", style: "text" },
          description: "",
        },
        {
          id: 11,
          block: "timeline-item",
          content: {
            year: "2021",
            title: "发布第一篇文章",
            layout: { incomplete: false, connectionMode: "start" },
            description: "写了文章",
          },
          description: "",
        },
        {
          id: 12,
          block: "timeline-item",
          content: {
            year: "2023",
            title: "似乎做了点什么",
            layout: {
              incomplete: false,
              swapPosition: true,
              connectionMode: "middle",
            },
            description: "又似乎没有",
          },
          description: "",
        },
        {
          id: 13,
          block: "timeline-item",
          content: {
            year: "2025",
            title: "似乎做了点什么",
            layout: {
              incomplete: false,
              swapPosition: false,
              connectionMode: "middle",
            },
            description: "又似乎没有",
          },
          description: "",
        },
        {
          id: 14,
          block: "timeline-item",
          content: {
            year: "2026",
            title: "开始用 NeutralPress 吧",
            layout: {
              incomplete: false,
              swapPosition: true,
              connectionMode: "middle",
            },
            description: "真好用吧",
          },
          description: "",
        },
        {
          id: 15,
          block: "timeline-item",
          content: {
            year: "？",
            title: "未来可期",
            layout: {
              incomplete: true,
              swapPosition: true,
              connectionMode: "end",
            },
            description: "",
          },
          description: "",
        },
        {
          id: 16,
          block: "tabs",
          content: {
            no1: {
              label: "关于我",
              content: [
                "这里是选项卡",
                "可以显示很多内容",
                "还能切换对齐方式",
                "或者切换到其他选项",
              ],
            },
            no2: {
              label: "关于本站",
              content: [
                "这里是选项卡",
                "可以显示很多内容",
                "还能切换对齐方式",
                "或者切换到其他选项",
              ],
            },
            no3: {
              label: "关于...",
              content: [
                "这里是选项卡",
                "可以显示很多内容",
                "还能切换对齐方式",
                "或者切换到其他选项",
              ],
            },
            layout: {
              tabPosition: "left",
              contentAlign: "center",
              tabsCentered: true,
              contentVerticalAlign: "center",
            },
          },
          description: "",
        },
        {
          id: 17,
          block: "multi-row-layout",
          content: {
            row1: { type: "marquee", marqueeContent: "Goodbye" },
            row2: {
              type: "marquee",
              marqueeContent: "See you next time",
              marqueeDirection: "right",
            },
            row3: { type: "marquee", marqueeContent: "best wishes" },
            row4: {
              type: "marquee",
              marqueeSpeed: 40,
              marqueeContent: "to you",
              backgroundColor: "default",
              marqueeDirection: "right",
            },
            rowCount: 4,
          },
          description: "",
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription:
      "了解 NeutralPress 团队的故事、使命和愿景，以及我们如何为内容创作者提供更好的工具",
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-gallery-page",
    title: "照片墙",
    slug: "/gallery",
    content: "",
    contentType: "BUILDIN",
    config: {},
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "展示个人和团队的摄影项目，捕捉生活中的精彩瞬间与美好回忆",
    metaKeywords: "",
    robotsIndex: true,
  },
  {
    id: "system-archive-page",
    title: "归档",
    slug: "/archive",
    content: "",
    contentType: "BLOCK",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            title: {
              value: "Archive / 归档",
            },
            header: {
              value: "Years. Months. Days.",
            },
            content: {
              top: {
                value: [
                  "回溯 & 列表所有时序。",
                  "",
                  "最近更新于 {lastPublishDays}，",
                  "共索引 {posts} 篇文章。",
                ],
              },
              bottom: {
                value: ["当前正在查看 归档列表。"],
              },
            },
          },
        },
        {
          id: 2,
          block: "archive-calendar",
          description: "",
          content: {
            layout: {
              style: "heatmap",
            },
          },
        },
        {
          id: 3,
          block: "archive-list",
          description: "",
          content: {
            sort: "publishedAt_desc",
            layout: {
              mode: "horizontal",
            },
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription:
      "按时间顺序整理的文章归档，方便浏览过去的内容和回顾历史记录",
    metaKeywords: "",
    robotsIndex: true,
  },
  // {
  //   id: "system-guestbook-page",
  //   title: "留言板",
  //   slug: "/guestbook",
  //   content: "",
  //   contentType: "MARKDOWN",
  //   config: {},
  //   status: "ACTIVE",
  //   isSystemPage: true,
  //   metaDescription:
  //     "欢迎在留言板上留下你的想法、建议或问候，与我们和其他读者交流互动",
  //   metaKeywords: "",
  //   robotsIndex: true,
  // },
];
