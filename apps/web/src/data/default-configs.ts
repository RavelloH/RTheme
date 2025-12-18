/**
 * 默认配置数据
 * 这些配置将在首次运行时添加到数据库中
 */

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

export interface DefaultConfig {
  key: string;
  value: JsonValue;
  description?: string;
}

// 站点基础配置
export const defaultConfigs: DefaultConfig[] = [
  // =====================================
  // 站点基础配置
  // =====================================
  {
    key: "site.title",
    value: { default: "NeutralPress" },
    description:
      "站点标题。显示为：{页面标题} | {站点标题}（格式可在seo.title.template中自定义）",
  },
  // TODO
  {
    key: "site.subtitle",
    value: { default: "" },
    description:
      "[可选] 站点子标题。如果设置，将显示为：{页面标题} | {站点标题} - {站点子标题}（格式可在seo.title.template中自定义）",
  },
  {
    key: "site.title.template",
    value: { default: "{pageTitle} | {title}( - {subtitle})" },
    description:
      "站点标题模板。{pageTitle}、{title}、{subtitle}将分别被替换为页面标题、站点标题、站点子标题。英文括号'()'及其内部内容将在未设置站点子标题时清空",
  },
  {
    key: "site.url",
    value: { default: "https://example.com" },
    description: "站点主域名地址。无需添加尾缀斜杠",
  },
  {
    key: "site.color",
    value: {
      default: {
        primary: "#2dd4bf",
        background: {
          light: "#ffffff",
          dark: "#111111",
        },
        muted: {
          light: "#f4f4f5",
          dark: "#202023",
        },
      },
    },
    description:
      "站点主题颜色设置。影响页面UI、用户默认头像等。需填写十六进制颜色值",
  },
  {
    key: "site.slogan.primary",
    value: { default: "Beginning of meditation." },
    description: "站点主标语。显示在主页",
  },
  {
    key: "site.slogan.secondary",
    value: { default: "Mind stuff, that's what they say when the verses fly." },
    description: "站点副标语。显示在菜单的最上方",
  },
  {
    key: "site.birthday",
    value: { default: new Date().toISOString() },
    description: "站点创建时间。用于计算运行天数及版权声明",
  },
  {
    key: "site.copyright",
    value: {
      default: [
        "All rights reserved.",
        "Powered by <a href='https://github.com/RavelloH/NeutralPress'>NeutralPress</a>.",
      ],
    },
    description:
      "站点版权信息。显示在菜单底部（桌面版）或页脚（移动版）。每行一条，可使用HTML",
  },
  // =====================================
  // 作者相关设置
  // =====================================
  {
    key: "author.name",
    value: { default: "Your Name" },
    description: "站点管理员/作者/团队名。影响版权声明、友链申请信息展示等",
  },
  // TODO
  {
    key: "author.bio",
    value: { default: "" },
    description: "[可选] 站点管理员/作者/团队简介签名。影响友链申请信息展示等",
  },
  {
    key: "author.mail",
    value: { default: "" },
    description: "[可选] 站点管理员/作者/团队邮箱",
  },
  // TODO
  {
    key: "author.birthday",
    value: { default: new Date().toISOString() },
    description:
      "[可选] 站点管理员/作者/团队生日。单独设置不生效，需与author.birthday.showAge共同设置",
  },
  {
    key: "author.birthday.showAge",
    value: { default: false },
    description:
      "单独设置不生效，需与author.birthday共同设置。开启后，在时间线中将显示当年作者年龄",
  },

  // =====================================
  // 站点SEO配置
  // =====================================
  {
    key: "seo.description",
    value: { default: "一个现代化的内容管理系统" },
    description: "[可选] 站点默认SEO描述",
  },
  {
    key: "seo.keywords",
    value: { default: ["CMS", "Blog", "NeutralPress"] },
    description: "[可选] 站点SEO关键词",
  },
  {
    key: "seo.category",
    value: { default: "Technology" },
    description: "[可选] 站点分类。用于SEO优化，但对SEO影响极小",
  },
  {
    key: "seo.country",
    value: { default: "" },
    description:
      "[可选] 站点所属国家（英文全称）。用于SEO优化，对SEO影响极小）",
  },
  {
    key: "seo.imageCard.enable",
    value: { default: true },
    description:
      "是否开启站点链接在分享时显示的图片摘要。关闭以减少资源消耗，但可能影响SEO效果",
  },
  {
    key: "seo.index.enable",
    value: { default: true },
    description: "是否允许搜索引擎索引此站点",
  },
  {
    key: "seo.twitter_site",
    value: { default: "@ravellohh" },
    description: "[可选] 官方Twitter账号",
  },
  {
    key: "seo.twitter_creator",
    value: { default: "@neutralpress" },
    description: "[可选] 内容创建者Twitter账号",
  },
  {
    key: "seo.google_verification",
    value: { default: "" },
    description:
      "[可选] Google Search Console网站验证码。适用于meta标签格式的验证方法",
  },
  // =====================================
  // 用户相关配置
  // =====================================
  {
    key: "user.registration.enabled",
    value: { default: true },
    description: "是否允许用户注册",
  },
  {
    key: "user.email.verification.required",
    value: { default: true },
    description:
      "是否需要用户注册后验证邮箱。需要设置相关环境变量以配置电子邮件发送服务，详见文档",
  },
  // =====================================
  // 内容相关配置
  // =====================================
  {
    key: "content.menu.enabled",
    value: { default: true },
    description: "是否启用文章目录",
  },
  {
    key: "content.slug.segment",
    value: { default: false },
    description:
      "是否对自动转换的拼音slug进行分词处理。例如：zheshi-yipian-wenzhang 而不是 zhe-shi-yi-pian-wen-zhang",
  },
  // =====================================
  // 媒体相关配置
  // =====================================
  {
    key: "media.upload.allowed_types",
    value: { default: ["image/jpeg", "image/png", "image/gif", "image/webp"] },
    description: "允许上传的媒体文件类型",
  },
  // =====================================
  // 评论相关配置
  // =====================================
  {
    key: "comment.enable",
    value: { default: true },
    description: "是否启用评论功能",
  },
  {
    key: "comment.placeholder",
    value: { default: "输入评论内容..." },
    description: "[可选] 评论输入框默认占位信息",
  },
  {
    key: "comment.antiSpam.enable",
    value: { default: true },
    description: "是否启用评论反垃圾功能。效果有限。",
  },
  {
    key: "comment.anonymous.enable",
    value: { default: true },
    description: "是否允许用户匿名评论，而无需登录账户",
  },
  {
    key: "comment.anonymous.email.required",
    value: { default: true },
    description: "是否需要匿名评论的用户提供邮箱。关闭后，邮箱作为可选字段",
  },
  {
    key: "comment.anonymous.website.enable",
    value: { default: true },
    description: "是否允许匿名评论的用户填写个人网站",
  },
  {
    key: "comment.email.notice.enable",
    value: { default: true },
    description:
      "是否在评论被回复时，向评论者发送通知邮件。控制所有用户，同时受 notice.enable 控制",
  },
  {
    key: "comment.anonymous.email.notice.enable",
    value: { default: true },
    description:
      "是否在评论被回复时，向评论者发送通知邮件。控制匿名用户，同时受 notice.enable 控制",
  },
  {
    key: "comment.review.enable",
    value: { default: false },
    description: "评论是否需要管理员审核后才能展示。控制所有评论",
  },
  {
    key: "comment.anonymous.review.enable",
    value: { default: false },
    description: "评论是否需要管理员审核后才能展示。控制匿名评论",
  },
  {
    key: "comment.locate.enable",
    value: { default: false },
    description:
      "是否在评论中显示评论者的IP归属地。管理面板中将始终显示 IP 信息，不受此选项影响",
  },
  // =====================================
  // 通知相关配置
  // =====================================
  {
    key: "notice.enable",
    value: { default: true },
    description: "是否启用通知功能",
  },
  {
    key: "notice.email",
    value: { default: "notice@example.com" },
    description: "[可选] 邮件通知发信地址。留空以关闭邮件通知功能",
  },
  {
    key: "notice.email.from.name",
    value: { default: "NeutralPress" },
    description: "邮件发件人显示名称",
  },
  {
    key: "notice.email.replyTo",
    value: { default: "" },
    description:
      "[可选] 邮件回复地址。如果留空，则使用 notice.email 作为回复地址",
  },
  {
    key: "notice.email.resend.apiKey",
    value: { default: "" },
    description:
      "[可选] Resend API key。填写后，使用 Resend 而不是 SMTP 发送邮件",
  },
  {
    key: "notice.email.smtp",
    value: {
      default: {
        user: "",
        host: "",
        port: "",
        tls: false,
        password: "",
      },
    },
    description:
      "邮件通知SMTP配置。字段较多，请参照文档配置。当设置 notice.email.resend.apiKey 后，自动忽略此配置",
  },
  {
    key: "notice.posts.enable",
    value: { default: true },
    description: "是否在文章被评论时，向作者发送通知",
  },
  // =====================================
  // AI 集成
  // =====================================
  {
    key: "ai.enable",
    value: { default: true },
    description:
      "是否启用AI相关辅助功能。需要同时配置 ai.gateway.url 与 ai.config",
  },
  {
    key: "ai.gateway.url",
    value: { default: "https://ai.ravelloh.com/" },
    description: "AI 网关地址。默认服务不保证可用性，请参考文档自建服务",
  },
  {
    key: "ai.config",
    value: {
      default: {
        service: "",
        apiKey: "",
        model: "",
      },
    },
    description: "AI 配置信息。参考文档设置",
  },
  // =====================================
  // 访问统计
  // =====================================
  {
    key: "analytics.enable",
    value: { default: true },
    description: "是否启用内建访问统计系统",
  },
  {
    key: "analytics.timezone",
    value: { default: "UTC" },
    description:
      "访问统计使用的时区。用于确定归档数据的日期边界。例如：UTC、Asia/Shanghai、America/New_York。不会影响已归档的数据",
  },
  {
    key: "analytics.precisionDays",
    value: { default: 30 },
    description:
      "高精度数据保留天数。超过此天数的数据将被压缩，成为低精度数据，以优化数据库占用。设置为0以保留所有数据。低精度数据在天数视图的统计结果上与高精度数据并无区别，但低精度数据无法进行关联查询（例如：不能查看目标为某路径且来源为某域名的访问量，但能查询某日的所有访问路径和所有访问来源）",
  },
  {
    key: "analytics.retentionDays",
    value: { default: 365 },
    description:
      "数据保留天数。超过此天数的数据将被删除（不会影响访问量统计）。设置为0以保留所有数据",
  },
  // =====================================
  // SSO 登录配置
  // =====================================
  // Google OAuth
  {
    key: "user.sso.google.enabled",
    value: { default: false },
    description:
      "是否启用 Google SSO 登录，详见 https://docs.ravelloh.com/docs/sso",
  },
  {
    key: "user.sso.google",
    value: {
      default: {
        clientId: "",
        clientSecret: "",
      },
    },
    description: "Google OAuth 配置参数",
  },
  // GitHub OAuth
  {
    key: "user.sso.github.enabled",
    value: { default: false },
    description:
      "是否启用 GitHub SSO 登录，详见 https://docs.ravelloh.com/docs/sso",
  },
  {
    key: "user.sso.github",
    value: {
      default: {
        clientId: "",
        clientSecret: "",
      },
    },
    description: "GitHub OAuth 配置参数",
  },
  // Microsoft OAuth
  {
    key: "user.sso.microsoft.enabled",
    value: { default: false },
    description:
      "是否启用 Microsoft SSO 登录，详见 https://docs.ravelloh.com/docs/sso",
  },
  {
    key: "user.sso.microsoft",
    value: {
      default: {
        clientId: "",
        clientSecret: "",
      },
    },
    description: "Microsoft OAuth 配置参数",
  },
];
