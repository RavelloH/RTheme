// apps/web/src/data/default-pages.ts
// 默认页面数据定义

import type { BlockConfig } from "@/blocks/core/types";

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

// 页面配置接口
export interface PageConfig {
  blocks?: BlockConfig[];
  [key: string]: unknown;
}

export interface DefaultPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentType?: "MARKDOWN" | "HTML" | "MDX";
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
    id: "home-page",
    title: "首页",
    slug: "/",
    content: "",
    contentType: "MARKDOWN",
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
                value: ["共有文章 {posts} 篇，", "收录作品 {projects} 件。"],
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
            worksDescription: {
              header: { value: "My main tech stack includes", align: "left" },
              content:
                "React / Next.js / TypeScript / JavaScript / TailwindCSS / Node.js / Express.js / Serverless / GraphQL / PostgreSQL / MySQL / Redis / Docker / Kubernetes / Webpack / Vite / C / C++ / C# / Jest / Cypress / Shell ...",
            },
            worksSummary: {
              content: [
                "不止这些。",
                "想要查看更多？",
                "前往我的 Github 来查看我的所有项目，",
                "或者在 Projects 页面看看相关描述。",
                "",
                "Github: [@xxx](https://github.com/RavelloH)",
              ],
              footer: {
                link: "/works",
                text: "View more projects",
              },
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
    metaKeywords: "CMS, 内容管理系统, 博客, NeutralPress, 现代化, 内容创作",
    robotsIndex: true,
  },
  {
    id: "projects-page",
    title: "作品",
    slug: "/projects",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription:
      "展示个人和团队的项目作品集，包含开源项目、商业案例和技术实践",
    metaKeywords: "作品集, 项目, 开源, 技术实践, 案例展示, 个人项目",
    robotsIndex: true,
  },
  {
    id: "posts-page",
    title: "文章",
    slug: "/posts",
    content: "",
    contentType: "MARKDOWN",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            header: { value: "Thoughts. Notes. Stories.", align: "left" },
            title: { value: "Posts / 文章", align: "left" },
            content: {
              top: {
                value: [
                  "记录 & 索引所有文章。",
                  "",
                  "最近更新于 {lastPublishDays}。",
                  "自 {firstPublishAt} 以来，共索引 {posts} 篇文章。",
                ],
                align: "left",
              },
              bottom: {
                value: [
                  "第 {page} 页，共 {totalPage} 页。",
                  "正在查看第 {firstPage} - {lastPage} 篇文章。",
                ],
                align: "left",
              },
            },
            footer: {
              link: "",
              text: "",
            },
          },
        },
        {
          id: 2,
          block: "default",
          description: "",
          content: {
            header: { value: "", align: "left" },
            title: { value: "", align: "left" },
            content: {
              top: { value: [], align: "left" },
              bottom: { value: [], align: "left" },
            },
            footer: {
              link: "",
              text: "",
            },
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription:
      "分享技术见解、开发经验和行业思考的博客文章，涵盖前端、后端、系统设计等多个领域",
    metaKeywords: "博客, 技术文章, 开发经验, 前端, 后端, 系统设计, 技术分享",
    robotsIndex: true,
  },
  {
    id: "categories-page",
    title: "分类",
    slug: "/categories",
    content: "",
    contentType: "MARKDOWN",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            header: { value: "Topics. Themes. Paths.", align: "left" },
            title: { value: "Categories / 分类", align: "left" },
            content: {
              top: {
                value: [
                  "整理 & 索引所有分类。",
                  "",
                  "最近更新于 {lastUpdatedDays}。",
                  "共索引 {categories} 个分类，",
                  "其中包含 {root} 个根分类，{child} 个子分类。",
                ],
                align: "left",
              },
              bottom: {
                value: ["当前正在查看 {pageInfo}。"],
                align: "left",
              },
            },
            footer: {
              link: "",
              text: "Random / 随便看看",
            },
          },
        },
        {
          id: 2,
          block: "default",
          description: "",
          content: {
            header: { value: "", align: "left" },
            title: { value: "", align: "left" },
            content: {
              top: { value: [], align: "left" },
              bottom: { value: [], align: "left" },
            },
            footer: {
              link: "",
              text: "",
            },
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "按主题和领域分类整理的文章列表，方便快速找到感兴趣的内容",
    metaKeywords: "文章分类, 内容分类, 主题导航, 文章目录",
    robotsIndex: true,
  },
  {
    id: "child-categories-page",
    title: "子分类",
    slug: "/categories/[slug]",
    content: "",
    contentType: "MARKDOWN",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            header: { value: "Topics. Themes. Paths.", align: "left" },
            title: { value: "分类：{categoryName}", align: "left" },
            content: {
              top: {
                value: [
                  "整理 & 索引 {categoryName} 下的所有子分类及文章。",
                  "",
                  "最近更新于 {lastUpdatedDays}。",
                  "此分类共包含 {categories} 个子分类，",
                  "{posts} 篇文章。",
                ],
                align: "left",
              },
              bottom: {
                value: [
                  "当前正在查看 {pageInfo}。",
                  "第 {page} 页，共 {totalPage} 页。",
                  "正在查看第 {firstPage} - {lastPage} 篇文章。",
                ],
                align: "left",
              },
            },
            footer: {
              link: "",
              text: "Back / 返回上一级分类",
            },
          },
        },
        {
          id: 2,
          block: "default",
          description: "",
          content: {
            header: { value: "", align: "left" },
            title: { value: "", align: "left" },
            content: {
              top: { value: [], align: "left" },
              bottom: { value: [], align: "left" },
            },
            footer: {
              link: "",
              text: "",
            },
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "按主题和领域分类整理的文章列表，方便快速找到感兴趣的内容",
    metaKeywords: "文章分类, 内容分类, 主题导航, 文章目录",
    robotsIndex: true,
  },
  {
    id: "tags-page",
    title: "标签",
    slug: "/tags",
    content: "",
    contentType: "MARKDOWN",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            header: { value: "Keywords. Connections. Traces.", align: "left" },
            title: { value: "Tags / 标签", align: "left" },
            content: {
              top: {
                value: [
                  "整理 & 索引所有标签。",
                  "",
                  "最近更新于 {lastUpdatedDays}。",
                  "共索引 {tags} 个标签。",
                ],
                align: "left",
              },
              bottom: {
                value: ["当前正在查看 {pageInfo}。"],
                align: "left",
              },
            },
            footer: {
              link: "",
              text: "Random / 随便看看",
            },
          },
        },
        {
          id: 2,
          block: "default",
          description: "",
          content: {
            header: { value: "", align: "left" },
            title: { value: "", align: "left" },
            content: {
              top: { value: [], align: "left" },
              bottom: { value: [], align: "left" },
            },
            footer: {
              link: "",
              text: "",
            },
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "通过标签快速发现相关文章，标签云展示内容的分布和热点话题",
    metaKeywords: "标签, 标签云, 关键词, 文章标签, 内容索引",
    robotsIndex: true,
  },
  {
    id: "child-tags-page",
    title: "标签",
    slug: "/tags/[slug]",
    content: "",
    contentType: "MARKDOWN",
    config: {
      blocks: [
        {
          id: 1,
          block: "default",
          description: "",
          content: {
            header: { value: "Keywords. Connections. Traces.", align: "left" },
            title: { value: "标签：{tagName}", align: "left" },
            content: {
              top: {
                value: [
                  "整理 & 索引 {tag} 下的所有文章。",
                  "",
                  "此标签共包含 {posts} 个文章。",
                ],
                align: "left",
              },
              bottom: {
                value: [
                  "当前正在查看 {pageInfo}。",
                  "第 {page} 页，共 {totalPage} 页。",
                  "正在查看第 {firstPage} - {lastPage} 篇文章。",
                ],
                align: "left",
              },
            },
            footer: {
              link: "",
              text: "Back / 返回标签列表",
            },
          },
        },
        {
          id: 2,
          block: "default",
          description: "",
          content: {
            header: { value: "", align: "left" },
            title: { value: "", align: "left" },
            content: {
              top: { value: [], align: "left" },
              bottom: { value: [], align: "left" },
            },
            footer: {
              link: "",
              text: "",
            },
          },
        },
      ],
    },
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "通过标签快速发现相关文章，标签云展示内容的分布和热点话题",
    metaKeywords: "标签, 标签云, 关键词, 文章标签, 内容索引",
    robotsIndex: true,
  },
  {
    id: "friends-page",
    title: "友链",
    slug: "/friends",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription:
      "推荐的优秀网站、技术博客和合作伙伴，包含高质量的技术资源和创意作品",
    metaKeywords: "友情链接, 推荐网站, 技术博客, 合作伙伴, 网站导航",
    robotsIndex: true,
  },
  {
    id: "about-page",
    title: "关于",
    slug: "/about",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription:
      "了解 NeutralPress 团队的故事、使命和愿景，以及我们如何为内容创作者提供更好的工具",
    metaKeywords: "关于我们, 团队介绍, 公司简介, 使命愿景, 团队故事",
    robotsIndex: true,
  },
  {
    id: "gallery-page",
    title: "照片墙",
    slug: "/gallery",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    status: "ACTIVE",
    isSystemPage: true,
    metaDescription: "展示个人和团队的摄影作品，捕捉生活中的精彩瞬间与美好回忆",
    metaKeywords: "照片墙, 摄影作品, 生活瞬间, 作品展示, 视觉故事",
    robotsIndex: true,
  },
];
