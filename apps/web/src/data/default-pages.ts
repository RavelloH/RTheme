/**
 * 默认页面数据
 * 定义系统初始化时创建的默认页面
 */

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

export interface DefaultPage {
  id: string;
  title: string;
  slug: string;
  content: string; // Markdown/HTML/MDX 文本内容
  contentType?: "MARKDOWN" | "HTML" | "MDX";
  config?: JsonValue; // 页面配置（用于系统页面的显示设置）
  excerpt?: string;
  status: "DRAFT" | "ACTIVE" | "SUSPENDED";
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string;
  isSystemPage?: boolean; // 是否为系统预设页面
}

/**
 * 默认页面列表
 * 系统页面（isSystemPage: true）：由系统逻辑渲染，可通过 config 配置显示行为
 * 自定义页面（isSystemPage: false）：通过 content 字段存储用户自定义内容
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
          id: 1,
          description:
            "自定义块1，显示在Slogen与“作品”之间。正文下半部分将显示文章、作品计数。使用 {works} 来表示作品数，{posts} 来表示文章数",
          enabled: true,
          content: {
            header: {
              value: "Welcome. I'm...",
              description: "头部显示文本",
            },
            title: {
              value: "NeutralPress | 中性色",
              description: "标题文本",
            },
            content: {
              value: {
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
                bottom: ["共有文章 {posts} 篇，", "收录作品 {works} 件。"],
              },
              description: "正文文本，分别显示在正文顶部和底部",
            },
            footer: {
              value: {
                link: "/about",
                description: "Learn more about me",
              },
              description: "底部显示文本，可提供链接用于跳转",
            },
          },
        },
        {
          id: 2,
          description: "自定义块2，显示在“作品”与“文章”之间",
          enabled: false,
          content: {
            header: {
              value: "",
              description: "头部显示文本",
            },
            title: {
              value: "",
              description: "标题文本",
            },
            content: {
              value: {
                top: [],
                bottom: [],
              },
              description: "正文文本，分别显示在正文顶部和底部",
            },
            footer: {
              value: {
                link: "",
                description: "",
              },
              description: "底部显示文本，可提供链接用于跳转",
            },
          },
        },
        {
          id: 3,
          description: "自定义块3，显示在“文章”与“标签 & 分类”之间",
          enabled: false,
          content: {
            header: {
              value: "",
              description: "头部显示文本",
            },
            title: {
              value: "",
              description: "标题文本",
            },
            content: {
              value: {
                top: [],
                bottom: [],
              },
              description: "正文文本，分别显示在正文顶部和底部",
            },
            footer: {
              value: {
                link: "",
                description: "",
              },
              description: "底部显示文本，可提供链接用于跳转",
            },
          },
        },
        {
          id: 4,
          description: "自定义块4，显示在页面最后",
          enabled: true,
          content: {
            header: {
              value: "Want to...",
              description: "头部显示文本",
            },
            title: {
              value: "Contact me / 联系我",
              description: "标题文本",
            },
            content: {
              value: {
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
              description: "正文文本，分别显示在正文顶部和底部",
            },
            footer: {
              value: {
                link: "/message?uid=1",
                description: "Start chatting with me",
              },
              description: "底部显示文本，可提供链接用于跳转",
            },
          },
        },
      ],
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
    excerpt: "欢迎来到 NeutralPress - 现代化的内容管理系统",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "projects-page",
    title: "作品",
    slug: "/projects",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "作品展示页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "posts-page",
    title: "文章",
    slug: "/posts",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "文章列表页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "categories-page",
    title: "分类",
    slug: "/categories",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "文章分类页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "tags-page",
    title: "标签",
    slug: "/tags",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "文章标签页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "friends-page",
    title: "友链",
    slug: "/friends",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "友情链接页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
  {
    id: "about-page",
    title: "关于",
    slug: "/about",
    content: "",
    contentType: "MARKDOWN",
    config: {},
    excerpt: "关于页面",
    status: "ACTIVE",
    isSystemPage: true,
  },
];
