/**
 * 默认配置定义
 */

// Prisma Json 类型定义
type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];

/**
 * 所有配置项的结构化定义
 *
 * 结构说明：
 * - 每个配置项必须包含 `default` 键，作为该配置的主值。
 * - `description` 是保留键，用于存储配置描述。
 * - 也可以定义其他键，它们将作为 `default` 的兄弟字段存储在 JSON 中。
 */
export const CONFIG_DEFINITIONS = {
  // =====================================
  // 站点基础配置
  // =====================================
  "site.title": {
    default: "NeutralPress",
    description:
      "站点标题。显示为：{页面标题} | {站点标题}（格式可在seo.title.template中自定义）",
  },
  "site.subtitle": {
    default: "",
    description:
      "[可选] 站点子标题。如果设置，将显示为：{页面标题} | {站点标题} - {站点子标题}（格式可在seo.title.template中自定义）",
  },
  "site.title.template": {
    default: "{pageTitle} | {title}( - {subtitle})",
    description:
      "站点标题模板。{pageTitle}、{title}、{subtitle}将分别被替换为页面标题、站点标题、站点子标题。英文括号'()'及其内部内容将在未设置站点子标题时清空",
  },
  "site.url": {
    default: "https://example.com",
    description: "站点主域名地址。无需添加尾缀斜杠",
  },
  "site.color": {
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
    description:
      "站点主题颜色设置。影响页面UI、用户默认头像等。需填写十六进制颜色值",
  },
  "site.shiki.theme": {
    default: {
      light: "light-plus",
      dark: "dark-plus",
    },
    description:
      "代码高亮主题。参考 https://shiki.style/themes ，填写主题 ID。",
  },
  "site.slogan.primary": {
    default: "A neutral place to share your thoughts.",
    description: "站点主标语。显示在主页",
  },
  "site.slogan.secondary": {
    default: "Welcome to NeutralPress",
    description: "站点副标语。显示在菜单的最上方",
  },
  "site.birthday": {
    default: new Date().toISOString(),
    description: "站点创建时间。用于计算运行天数及版权声明",
  },
  "site.copyright": {
    default: [
      "All rights reserved.",
      "Powered by <a href='https://github.com/RavelloH/NeutralPress'>NeutralPress</a>.",
    ] as string[],
    description:
      "站点版权信息。显示在菜单底部（桌面版）或页脚（移动版）。每行一条，可使用HTML",
  },

  // =====================================
  // 作者相关设置
  // =====================================
  "author.name": {
    default: "Your Name",
    description: "站点管理员/作者/团队名。影响版权声明、友链申请信息展示等",
  },
  "author.bio": {
    default: "",
    description: "[可选] 站点管理员/作者/团队简介签名。影响友链申请信息展示等",
  },
  "author.mail": {
    default: "",
    description: "[可选] 站点管理员/作者/团队邮箱",
  },
  "author.birthday": {
    default: new Date().toISOString(),
    description:
      "[可选] 站点管理员/作者/团队生日。单独设置不生效，需与author.birthday.showAge共同设置",
  },
  "author.birthday.showAge": {
    default: false,
    description:
      "单独设置不生效，需与author.birthday共同设置。开启后，在时间线中将显示当年作者年龄",
  },

  // =====================================
  // 站点SEO配置
  // =====================================
  "seo.description": {
    default: "一个现代化的内容管理系统",
    description: "[可选] 站点默认SEO描述",
  },
  "seo.keywords": {
    default: ["CMS", "Blog", "NeutralPress"] as string[],
    description: "[可选] 站点SEO关键词",
  },
  "seo.category": {
    default: "Technology",
    description: "[可选] 站点分类。用于SEO优化，但对SEO影响极小",
  },
  "seo.country": {
    default: "",
    description:
      "[可选] 站点所属国家（英文全称）。用于SEO优化，对SEO影响极小）",
  },
  "seo.imageCard.enable": {
    default: true,
    description:
      "是否开启站点链接在分享时显示的图片摘要。关闭以减少资源消耗，但可能影响SEO效果",
  },
  "seo.index.enable": {
    default: true,
    description: "是否允许搜索引擎索引此站点",
  },
  "seo.twitter_site": {
    default: "",
    description: "[可选] 官方Twitter账号，例如 @xxx",
  },
  "seo.twitter_creator": {
    default: "",
    description: "[可选] 内容创建者Twitter账号，例如 @xxx",
  },
  "seo.google_verification": {
    default: "",
    description:
      "[可选] Google Search Console网站验证码。适用于meta标签格式的验证方法",
  },

  // =====================================
  // 用户相关配置
  // =====================================
  "user.registration.enabled": {
    default: true,
    description: "是否允许用户注册",
  },
  "user.email.verification.required": {
    default: false,
    description:
      "是否需要用户注册后验证邮箱。需要设置相关环境变量以配置电子邮件发送服务，详见文档",
  },
  "user.sso.google.enabled": {
    default: false,
    description:
      "是否启用 Google SSO 登录，详见 https://docs.ravelloh.com/docs/sso",
  },
  "user.sso.google": {
    default: {
      clientId: "",
      clientSecret: "",
    },
    description: "Google OAuth 配置参数",
  },
  "user.sso.github.enabled": {
    default: false,
    description:
      "是否启用 GitHub SSO 登录，详见 https://docs.ravelloh.com/docs/sso",
  },
  "user.sso.github": {
    default: {
      clientId: "",
      clientSecret: "",
    },
    description: "GitHub OAuth 配置参数",
  },
  "user.sso.microsoft.enabled": {
    default: false,
    description:
      "是否启用 Microsoft SSO 登录，详见 https://docs.ravelloh.com/docs/sso",
  },
  "user.sso.microsoft": {
    default: {
      clientId: "",
      clientSecret: "",
    },
    description: "Microsoft OAuth 配置参数",
  },
  "user.passkey.enabled": {
    default: true,
    description: "是否启用通行密钥功能",
  },
  "user.passkey.maxPerUser": {
    default: 5,
    description: "每个用户允许绑定的最大通行密钥数量",
  },

  // =====================================
  // 内容相关配置
  // =====================================
  "content.license.default": {
    default: "all-rights-reserved" as
      | "all-rights-reserved"
      | "cc-0"
      | "cc-by"
      | "cc-by-sa"
      | "cc-by-nd"
      | "cc-by-nc"
      | "cc-by-nc-sa"
      | "cc-by-nc-nd",
    options: [
      {
        value: "all-rights-reserved",
        label: "All Rights Reserved - 保留所有权利 - 未经授权禁止转载或使用",
      },
      {
        value: "cc-0",
        label: "CC0",
      },
      {
        value: "cc-by",
        label: "CC BY - 署名",
      },
      {
        value: "cc-by-sa",
        label: "CC BY-SA - 署名 - 以相同方式分享",
      },
      {
        value: "cc-by-nd",
        label: "CC BY-ND - 署名 - 不可改作",
      },
      {
        value: "cc-by-nc",
        label: "CC BY-NC - 署名 - 不可商用",
      },
      {
        value: "cc-by-nc-sa",
        label: "CC BY-NC-SA - 署名 - 不可商用 - 以相同方式分享",
      },
      {
        value: "cc-by-nc-nd",
        label: "CC BY-NC-ND - 署名 - 不可商用 - 禁止改作",
      },
    ],
    description: "文章默认版权声明许可证，详情参考文章编辑器中的版权声明选项",
  },
  "content.license.textTemplate": {
    default: "本文原创内容使用 {LICENSE}。",
    description:
      "文章版权声明文本模板。{LICENSE} 将被替换为具体的许可证描述文本",
  },
  "content.menu.enabled": {
    default: true,
    description: "是否启用文章目录",
  },
  "content.slug.segment": {
    default: false,
    description:
      "是否对自动转换的拼音slug进行分词处理。例如：zheshi-yipian-wenzhang 而不是 zhe-shi-yi-pian-wen-zhang",
  },
  "content.autoIndex.enabled": {
    default: true,
    description:
      "是否在每次文章保存时自动更新搜索索引。这可能会略微增加保存时间",
  },
  "content.rss.enabled": {
    default: true,
    description: "是否启用RSS订阅功能",
  },
  "content.rss.postCount": {
    default: 10,
    description: "RSS订阅中包含的最新文章数量",
  },
  "content.rss.showFullContent": {
    default: true,
    description: "RSS订阅中是否显示文章全文，若关闭则仅显示摘要",
  },
  "content.rss.autoGenerateExcerpt": {
    default: true,
    description:
      "如果文章未手动设置摘要，是否自动截取文章内容作为摘要。如果 content.rss.showFullContent 为 true 则此配置无效",
  },
  "content.rss.maxExcerptLength": {
    default: 200,
    description:
      "RSS订阅中自动文章摘要的最大长度，单位为字符。如果 content.rss.showFullContent 为 true 则此配置无效。需与 content.rss.autoGenerateExcerpt 配合使用",
  },
  "content.githubAutoSync.enabled": {
    default: true,
    description: "是否启用GitHub内容自动同步功能，用于更新项目信息",
  },
  "content.githubAutoSync.personalKey": {
    default: "",
    description:
      "[可选] GitHub个人访问令牌（Personal Access Token）。建议填写以避免API速率限制，详见文档",
  },

  // =====================================
  // 媒体相关配置
  // =====================================
  "media.antiHotLink.enable": {
    default: false,
    description:
      "是否开启防盗链功能。开启后，从其他站点直接引用本站原始图片（/p/*、/image-proxy）将被拒绝。优化图片（/_next/image）不受影响。",
  },
  "media.antiHotLink.allowEmptyReferrer": {
    default: true,
    description:
      "是否允许空 Referer 访问媒体资源。关闭将减小图片被爬取的可能，但可能影响部分浏览器或隐私插件的正常访问",
  },
  "media.antiHotLink.allowedDomains": {
    default: [
      "google.com",
      "bing.com",
      "yahoo.com",
      "duckduckgo.com",
      "yandex.com",
      "baidu.com",
    ] as string[],
    description:
      "除本站域名（site.url）外，允许引用本站媒体资源的域名白名单列表。填写完整域名，每行一个。建议添加常见搜索引擎域名以允许其爬取图片",
  },
  "media.antiHotLink.fallbackImage.enable": {
    default: true,
    description:
      "是否在防盗链拦截时，返回一张占位图片来提示回到此站查看图片。关闭后将直接返回403错误",
  },
  "media.gallery.sortByShotTime": {
    default: false,
    description:
      "画廊页面是否优先按拍摄时间排序。开启后，若照片包含拍摄时间元数据，则优先按拍摄时间排列；否则按当前上传时间排列",
  },
  "media.gallery.sortOrder": {
    default: "desc" as "asc" | "desc",
    options: [
      { value: "desc", label: "最新在前 (desc)" },
      { value: "asc", label: "最早在前 (asc)" },
    ],
    description:
      "画廊页面照片的排序顺序，最新照片在前（desc）或最早照片在前（asc）",
  },
  // =====================================
  // 评论相关配置
  // =====================================
  "comment.enable": {
    default: true,
    description: "是否启用评论功能",
  },
  "comment.placeholder": {
    default: "输入评论内容...",
    description: "[可选] 评论输入框默认占位信息",
  },
  "comment.akismet.enable": {
    default: false,
    description:
      "是否启用Akismet反垃圾功能，若开启需同时填写comment.akismet.apiKey。开启后可自动检测垃圾评论。不会对 AUTHOR/EDITOR/ADMIN 进行检查。详见 https://docs.ravelloh.com/docs/comment#akismet",
  },
  "comment.akismet.apiKey": {
    default: "",
    description: "[可选] Akismet API Key。启用 Akismet 反垃圾功能所需",
  },
  "comment.akismet.report.enable": {
    default: true,
    description: "是否在管理员将评论标记为垃圾评论时，上报至 Akismet",
  },
  "comment.anonymous.enable": {
    default: true,
    description: "是否允许用户匿名评论，而无需登录账户",
  },
  "comment.anonymous.email.required": {
    default: true,
    description: "是否需要匿名评论的用户提供邮箱。关闭后，邮箱作为可选字段",
  },
  "comment.anonymous.website.enable": {
    default: true,
    description: "是否允许匿名评论的用户填写个人网站",
  },
  "comment.email.notice.enable": {
    default: true,
    description:
      "是否在评论被回复时，向评论者发送通知邮件。控制所有用户，同时受 notice.enable 控制",
  },
  "comment.anonymous.email.notice.enable": {
    default: true,
    description:
      "是否在评论被回复时，向评论者发送通知邮件。控制匿名用户，同时受 notice.enable 控制",
  },
  "comment.review.enable": {
    default: false,
    description: "评论是否需要管理员审核后才能展示。控制所有评论",
  },
  "comment.anonymous.review.enable": {
    default: false,
    description: "评论是否需要管理员审核后才能展示。控制匿名评论",
  },
  "comment.review.notifyAdmin.enable": {
    default: true,
    description:
      "若开启评论审核，是否在有新评论待审核时通知管理员及编辑(ADMIN/EDITOR)",
  },
  "comment.review.notifyAdmin.uid": {
    default: ["1"] as string[],
    description:
      "审核通知应该发送给哪个用户。填写用户UID，每行一个。不填写则发送给所有ADMIN/Editor",
  },
  "comment.review.notifyAdmin.threshold": {
    default: 1,
    description: "当待审核评论数量达到该阈值时，才发送通知",
  },
  "comment.locate.enable": {
    default: false,
    description:
      "是否在评论中显示评论者的IP归属地。管理面板中将始终显示 IP 信息，不受此选项影响",
  },

  // =====================================
  // 通知相关配置
  // =====================================
  "notice.enable": {
    default: true,
    description: "是否启用通知功能",
  },
  "notice.email": {
    default: "notice@example.com",
    description: "[可选] 邮件通知发信地址。留空以关闭邮件通知功能",
  },
  "notice.email.from.name": {
    default: "NeutralPress",
    description: "邮件发件人显示名称",
  },
  "notice.email.replyTo": {
    default: "",
    description:
      "[可选] 邮件回复地址。如果留空，则使用 notice.email 作为回复地址",
  },
  "notice.email.resend.apiKey": {
    default: "",
    description:
      "[可选] Resend API key。填写后，使用 Resend 而不是 SMTP 发送邮件",
  },
  "notice.email.smtp": {
    default: {
      user: "",
      host: "",
      port: "",
      tls: false,
      password: "",
    },
    description:
      "邮件通知SMTP配置。字段较多，请参照文档配置。当设置 notice.email.resend.apiKey 后，自动忽略此配置",
  },
  "notice.posts.enable": {
    default: true,
    description: "是否在文章被评论时，向作者发送通知",
  },
  "notice.ably.key": {
    default: "",
    description:
      "[可选] Ably API 密钥。填写后可启用 WebSocket 连接，增强通知、聊天的实时性。详见 https://docs.ravelloh.com/docs/ably",
  },
  "notice.webPush.enable": {
    default: true,
    description:
      "是否启用 WebPush 通知功能，可实现实时推送服务。需要用户允许浏览器接收通知权限",
  },
  "notice.webPush.maxPerUser": {
    default: 5,
    description: "每个用户允许订阅的最大 Web Push 设备数量",
  },
  "notice.webPush.vapidKeys": {
    default: {
      publicKey: "[AUTO_GENERATED]",
      privateKey: "[AUTO_GENERATED]",
    },
    description:
      "WebPush VAPID 密钥对。需要同时配置 publicKey 与 privateKey。默认会初始化生成一套，一般无需修改",
  },

  // =====================================
  // 友链管理
  // =====================================
  "friendlink.apply.enable": {
    default: true,
    description: "是否允许用户提交友链申请",
  },
  "friendlink.apply.checkBackLink.enable": {
    default: true,
    description:
      "是否在用户提交友链申请时，先检查对方站点是否存在本站链接作为反向链接。无链接则不会发起申请",
  },
  "friendlink.autoApprove.enable": {
    default: false,
    description:
      "是否自动批准友链申请。若开启 friendlink.apply.checkBackLink ，则仅对通过反向链接检查的申请自动批准",
  },
  "friendlink.showProfile.enable": {
    default: true,
    description: "是否在友链列表中显示你的简介信息，以便其他站长添加",
  },
  "friendlink.profile.avatar": {
    default: "/icon/512x",
    description: "你的信息中的头像URL地址",
  },
  "friendlink.profile.name": {
    default: "",
    description: "你的信息中的名称。不填则使用站点标题",
  },
  "friendlink.profile.website": {
    default: "",
    description: "你的信息中的网站地址。不填则使用站点 URL",
  },
  "friendlink.profile.description": {
    default: "",
    description: "你的信息中的简介描述。不填则使用 site.slogan.primary",
  },
  "friendlink.autoCheck.enable": {
    default: true,
    description: "是否定期自动检查友链的可用性。关闭后仅可手动检查",
  },
  "friendlink.autoCheck.checkBackLink.enable": {
    default: true,
    description:
      "是否在自动检查时，验证对方站点有本站点的反向链接。手动标记为跳过回链检查的友链除外",
  },
  "friendlink.autoCheck.autoManageStatus.enable": {
    default: true,
    description:
      "是否根据自动检查结果，自动更新友链状态（例如：对方站点无法访问则标记为不可用）。这会导致友链检查连续失败 30 次后，自动隐藏该友链",
  },
  "friendlink.autoCheck.alertApplicant.enable": {
    default: true,
    description: "是否在自动检查发现友链异常时，发送通知给友链申请者",
  },
  "friendlink.autoCheck.alertAdmin.enable": {
    default: true,
    description: "是否在自动检查发现友链异常时，发送通知给管理员（ADMIN）",
  },
  "friendlink.noticeApplicant.enable": {
    default: true,
    description:
      "是否在友链状态变更时，发送通知给友链申请者（例如：友链审核通过/拒绝/删除）",
  },
  // =====================================
  // AI 集成
  // =====================================
  "ai.enable": {
    default: true,
    description:
      "是否启用AI相关辅助功能。需要同时配置 ai.gateway.url 与 ai.config",
  },
  "ai.gateway.url": {
    default: "https://ai.ravelloh.com/",
    description: "AI 网关地址。默认服务不保证可用性，请参考文档自建服务",
  },
  "ai.config": {
    default: {
      service: "",
      apiKey: "",
      model: "",
    },
    description: "AI 配置信息。参考文档设置",
  },

  // =====================================
  // 聊天系统
  // =====================================
  "message.enable": {
    default: true,
    description: "是否启用站内信系统",
  },
  "message.userToUser.enable": {
    default: true,
    description: "是否允许USER与USER之间相互发送站内信",
  },
  "message.userToAdmin.enable": {
    default: true,
    description: "是否允许USER向ADMIN/EDITOR/AUTHOR发送站内信",
  },

  // =====================================
  // 访问统计
  // =====================================
  "analytics.enable": {
    default: true,
    description: "是否启用内建访问统计系统",
  },
  "analytics.timezone": {
    default: "Asia/Shanghai",
    description:
      "访问统计使用的时区。用于确定归档数据的日期边界。请改为管理员所在时区，例如：UTC、Asia/Shanghai、America/New_York。不会影响已归档的数据",
  },
  "analytics.precisionDays": {
    default: 30,
    description:
      "高精度数据保留天数。超过此天数的数据将被压缩，成为低精度数据，以优化数据库占用。设置为0以保留所有数据。低精度数据在天数视图的统计结果上与高精度数据并无区别，但低精度数据无法进行关联查询（例如：不能查看目标为某路径且来源为某域名的访问量，但能查询某日的所有访问路径和所有访问来源）",
  },
  "analytics.retentionDays": {
    default: 365,
    description:
      "数据保留天数。超过此天数的数据将被删除（不会影响访问量统计）。设置为0以保留所有数据",
  },
} as const;

/**
 * 类型定义的内部提取器
 * 自动处理 read-only 数组
 */
type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

/**
 * 自动推导出的配置类型映射表
 * 指向每个定义项的 `default` 字段类型
 */
export type ConfigTypes = {
  [K in keyof typeof CONFIG_DEFINITIONS]: DeepWriteable<
    (typeof CONFIG_DEFINITIONS)[K]["default"]
  >;
};

/**
 * 所有配置键名类型
 */
export type ConfigKeys = keyof ConfigTypes;

/**
 * 核心类型工具：根据配置 key 获取配置值的类型
 */
export type ConfigType<K extends ConfigKeys> = ConfigTypes[K];

/**
 * 所有配置的类型映射
 */
export type ConfigTypeMap = ConfigTypes;

/**
 * 数据库初始化的配置项结构
 */
export interface DefaultConfig {
  key: string;
  value: JsonValue;
  description?: string;
}

/**
 * 计算生成的 defaultConfigs 数组
 * 用于初次运行时写入数据库。
 * 将定义中除了 description 以外的所有字段作为 JSON 对象存入 value。
 */
export const defaultConfigs: DefaultConfig[] = (
  Object.keys(CONFIG_DEFINITIONS) as ConfigKeys[]
).map((key) => {
  const { description, ...values } = CONFIG_DEFINITIONS[key];
  return {
    key,
    value: values as JsonValue,
    description,
  };
});

/**
 * 默认配置值的 Map 映射，用于快速查找
 * @internal
 */
export const defaultConfigMap = new Map<string, JsonValue>();

// 初始化 Map
defaultConfigs.forEach((c) => defaultConfigMap.set(c.key, c.value));

export interface ConfigOption {
  label: string;
  value: string | number;
}

// 提取 default 字段的值
export const extractDefaultValue = (value: unknown): unknown => {
  if (
    typeof value === "object" &&
    value !== null &&
    "default" in value &&
    (value as { default: unknown }).default !== undefined
  ) {
    return (value as { default: unknown }).default;
  }
  return value;
};

// 提取 options 字段的值
export const extractOptions = (value: unknown): ConfigOption[] | undefined => {
  if (
    typeof value === "object" &&
    value !== null &&
    "options" in value &&
    Array.isArray((value as { options: unknown }).options)
  ) {
    return (value as { options: ConfigOption[] }).options;
  }
  return undefined;
};
