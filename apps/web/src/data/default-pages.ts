// apps/web/src/data/default-pages.ts
// 默认页面数据定义

import type {
  DefaultBlockConfig,
  DefaultBlockContent,
} from "@/blocks/collection/Default/types";
import type { BlockConfig } from "@/blocks/core/types";

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

// 页面配置接口
export interface PageConfig {
  blocks?: BlockConfig[];
  components?: unknown[]; // components 暂未重构类型，保持原样或定义为 unknown
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

// 定义 Block 模板，方便复用
const createDefaultBlock = (
  id: number,
  description: string,
  content: DefaultBlockContent,
): DefaultBlockConfig => ({
  id,
  block: "default",
  description,
  content,
});

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
        // Block 0: Hero
        {
          id: 100,
          block: "hero",
          description: "首页顶部 Hero 区域",
          content: {},
        },
        // Block 1: Default (Introduction)
        createDefaultBlock(
          1,
          "自定义块1，显示在Slogen与「作品」之间。正文下半部分可显示文章、作品计数。",
          {
            header: "Welcome. I'm...",
            title: "NeutralPress | 中性色",
            content: {
              top: [
                "专为博客而打造的CMS系统。",
                "独特的横板滚动布局，",
                "完整的后台管理功能，",
                "便捷的可视化编辑器，",
                "方便的媒体管理面板，",
                "强大的内置访问统计，",
                "经济的无服务器模式，",
                "可靠的系统安全防御。",
              ],
              bottom: ["共有文章 {posts} 篇，", "收录作品 {projects} 件。"],
            },
            footer: {
              link: "/about",
              text: "Learn more about me",
            },
          },
        ),
        // Block 2: Projects
        {
          id: 101,
          block: "projects",
          description: "作品展示区域",
          content: {
            // 将原 component 数据内联
            worksDescription: {
              header: "My main tech stack includes",
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
        // Block 3: Default (Between Projects & Posts)
        createDefaultBlock(2, "自定义块2，显示在「作品」与「文章」之间", {
          header: "",
          title: "",
          content: {
            top: [],
            bottom: [],
          },
          footer: {
            link: "",
            text: "",
          },
        }),
        // Block 4: Posts
        {
          id: 102,
          block: "posts",
          description: "文章列表区域",
          content: {},
        },
        // Block 5: Default (Between Posts & Tags)
        createDefaultBlock(
          3,
          "自定义块3，显示在「文章」与「标签 & 分类」之间",
          {
            header: "",
            title: "",
            content: {
              top: [],
              bottom: [],
            },
            footer: {
              link: "",
              text: "",
            },
          },
        ),
        // Block 6: Tags & Categories
        {
          id: 103,
          block: "tags-categories",
          description: "标签与分类区域",
          content: {},
        },
        // Block 7: Default (Footer)
        createDefaultBlock(4, "自定义块4，显示在页面最后", {
          header: "Want to...",
          title: "Contact me / 联系我",
          content: {
            top: [
              "学习交流?",
              "洽谈合作?",
              "交个朋友?",
              "......",
              "欢迎通过邮箱联系我：",
              "xxx@example.com",
            ],
            bottom: [
              "或者，不用那么正式，",
              "直接使用下方的站内信系统和我聊聊。",
            ],
          },
          footer: {
            link: "/messages?uid=1",
            text: "Start chatting with me",
          },
        }),
      ],
      // 保留 components 以防兼容性问题，虽然新逻辑不再依赖它们
      components: [
        {
          id: "works-description",
          value: {
            header: "My main tech stack includes",
            content:
              "React / Next.js / TypeScript / JavaScript / TailwindCSS / Node.js / Express.js / Serverless / GraphQL / PostgreSQL / MySQL / Redis / Docker / Kubernetes / Webpack / Vite / C / C++ / C# / Jest / Cypress / Shell ...",
          },
          description:
            "“作品”上的自定义组件，显示在作品中间，可自定义头部和正文（单行）。正文将会居中显示",
        },
        {
          id: "works-summary",
          value: {
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
              description: "View more projects",
            },
          },
          description:
            "“作品”上的自定义组件，显示在最后，可自定义正文（多行）和底部链接",
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
        createDefaultBlock(
          1,
          "自定义块1，显示在页面开头。可显示文章统计信息。标题下方将显示搜索栏。",
          {
            header: "Thoughts. Notes. Stories.",
            title: "Posts / 文章",
            content: {
              top: [
                "记录 & 索引所有文章。",
                "",
                "最近更新于 {lastPublishDays}。",
                "自 {firstPublishAt} 以来，共索引 {posts} 篇文章。",
              ],
              bottom: [
                "第 {page} 页，共 {totalPage} 页。",
                "正在查看第 {firstPage} - {lastPage} 篇文章。",
              ],
            },
            footer: {
              link: "",
              text: "",
            },
          },
        ),
        createDefaultBlock(2, "自定义块2，显示在页面结尾。", {
          header: "",
          title: "",
          content: {
            top: [""],
            bottom: [""],
          },
          footer: {
            link: "",
            text: "",
          },
        }),
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
        createDefaultBlock(
          1,
          "自定义块1，显示在页面开头。可显示分类统计信息。底部文本的最后一行将始终显示路径",
          {
            header: "Topics. Themes. Paths.",
            title: "Categories / 分类",
            content: {
              top: [
                "整理 & 索引所有分类。",
                "",
                "最近更新于 {lastUpdatedDays}。",
                "共索引 {categories} 个分类，",
                "其中包含 {root} 个根分类，{child} 个子分类。",
              ],
              bottom: ["当前正在查看 {pageInfo}。"],
            },
            footer: {
              link: "",
              text: "Random / 随便看看",
            },
          },
        ),
        createDefaultBlock(2, "自定义块2，显示在页面结尾。", {
          header: "",
          title: "",
          content: {
            top: [""],
            bottom: [""],
          },
          footer: {
            link: "",
            text: "",
          },
        }),
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
        createDefaultBlock(
          1,
          "自定义块1，显示在页面开头。可显示分类统计信息。底部文本的最后一行将始终显示路径",
          {
            header: "Topics. Themes. Paths.",
            title: "分类：{categoryName}",
            content: {
              top: [
                "整理 & 索引 {categoryName} 下的所有子分类及文章。",
                "",
                "最近更新于 {lastUpdatedDays}。",
                "此分类共包含 {categories} 个子分类，",
                "{posts} 篇文章。",
              ],
              bottom: [
                "当前正在查看 {pageInfo}。",
                "第 {page} 页，共 {totalPage} 页。",
                "正在查看第 {firstPage} - {lastPage} 篇文章。",
              ],
            },
            footer: {
              link: "",
              text: "Back / 返回上一级分类",
            },
          },
        ),
        createDefaultBlock(2, "自定义块2，显示在页面结尾。", {
          header: "",
          title: "",
          content: {
            top: [""],
            bottom: [""],
          },
          footer: {
            link: "",
            text: "",
          },
        }),
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
        createDefaultBlock(
          1,
          "自定义块1，显示在页面开头。可显示标签统计信息。",
          {
            header: "Keywords. Connections. Traces.",
            title: "Tags / 标签",
            content: {
              top: [
                "整理 & 索引所有标签。",
                "",
                "最近更新于 {lastUpdatedDays}。",
                "共索引 {tags} 个标签。",
              ],
              bottom: ["当前正在查看 {pageInfo}。"],
            },
            footer: {
              link: "",
              text: "Random / 随便看看",
            },
          },
        ),
        createDefaultBlock(2, "自定义块2，显示在页面结尾。", {
          header: "",
          title: "",
          content: {
            top: [""],
            bottom: [""],
          },
          footer: {
            link: "",
            text: "",
          },
        }),
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
        createDefaultBlock(
          1,
          "自定义块1，显示在页面开头。可显示标签统计信息。",
          {
            header: "Keywords. Connections. Traces.",
            title: "标签：{tagName}",
            content: {
              top: [
                "整理 & 索引 {tag} 下的所有文章。",
                "",
                "此标签共包含 {posts} 个文章。",
              ],
              bottom: [
                "当前正在查看 {pageInfo}。",
                "第 {page} 页，共 {totalPage} 页。",
                "正在查看第 {firstPage} - {lastPage} 篇文章。",
              ],
            },
            footer: {
              link: "",
              text: "Back / 返回标签列表",
            },
          },
        ),
        createDefaultBlock(2, "自定义块2，显示在页面结尾。", {
          header: "",
          title: "",
          content: {
            top: [""],
            bottom: [""],
          },
          footer: {
            link: "",
            text: "",
          },
        }),
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
