import type { BaseBlockConfig } from "@/blocks/core/types/base";

/**
 * 社交平台配置接口
 * 每个平台都有独立的 URL 字段
 */
export interface SocialPlatformLinks {
  // ===== 核心社交媒体 =====
  /** Twitter/X */
  twitter?: string;
  /** Facebook */
  facebook?: string;
  /** Instagram */
  instagram?: string;
  /** Threads */
  threads?: string;
  /** Bluesky */
  bluesky?: string;
  /** Mastodon */
  mastodon?: string;
  /** Fediverse */
  fediverse?: string;
  /** Friendica */
  friendica?: string;

  // ===== 视频平台 =====
  /** YouTube */
  youtube?: string;
  /** Bilibili */
  bilibili?: string;
  /** TikTok */
  tiktok?: string;
  /** Twitch */
  twitch?: string;
  /** Vimeo */
  vimeo?: string;
  /** Kick */
  kick?: string;
  /** 微信视频号 */
  wechatChannels?: string;

  // ===== 专业社交 =====
  /** LinkedIn */
  linkedin?: string;
  /** Xing */
  xing?: string;

  // ===== 即时通讯 =====
  /** Discord */
  discord?: string;
  /** Telegram */
  telegram?: string;
  /** WhatsApp */
  whatsapp?: string;
  /** Line */
  line?: string;
  /** Messenger */
  messenger?: string;
  /** WeChat 微信 */
  wechat?: string;
  /** QQ */
  qq?: string;
  /** KakaoTalk */
  kakaoTalk?: string;
  /** Skype */
  skype?: string;
  /** Slack */
  slack?: string;

  // ===== 开发者平台 =====
  /** GitHub */
  github?: string;
  /** Gitee */
  gitee?: string;
  /** GitLab */
  gitlab?: string;
  /** CodePen */
  codepen?: string;
  /** Stack Overflow */
  stackOverflow?: string;
  /** npm */
  npmjs?: string;
  /** Vercel */
  vercel?: string;
  /** StackShare */
  stackshare?: string;

  // ===== 内容/博客平台 =====
  /** Medium */
  medium?: string;
  /** Tumblr */
  tumblr?: string;
  /** 知乎 */
  zhihu?: string;
  /** 豆瓣 */
  douban?: string;
  /** 微博 */
  weibo?: string;
  /** Blogger */
  blogger?: string;
  /** WordPress */
  wordpress?: string;
  /** Notion */
  notion?: string;
  /** 语雀 */
  yuque?: string;
  /** GitBook */
  gitbook?: string;
  /** Disqus */
  disqus?: string;

  // ===== 设计平台 =====
  /** Dribbble */
  dribbble?: string;
  /** Behance */
  behance?: string;
  /** ZCOOL 站酷 */
  zcool?: string;
  /** Figma */
  figma?: string;

  // ===== 音乐平台 =====
  /** Spotify */
  spotify?: string;
  /** SoundCloud */
  soundcloud?: string;
  /** 网易云音乐 */
  neteaseMusic?: string;

  // ===== 图片分享 =====
  /** Pinterest */
  pinterest?: string;
  /** Flickr */
  flickr?: string;
  /** Unsplash */
  unsplash?: string;
  /** Pixelfed */
  pixelfed?: string;

  // ===== 自由职业平台 =====
  /** Fiverr */
  fiverr?: string;
  /** Upwork */
  upwork?: string;

  // ===== 游戏平台 =====
  /** Steam */
  steam?: string;
  /** Xbox */
  xbox?: string;
  /** PlayStation */
  playstation?: string;
  /** Nintendo Switch */
  switchNintendo?: string;

  // ===== 协作工具 =====
  /** Trello */
  trello?: string;
  /** Dropbox */
  dropbox?: string;
  /** Spectrum */
  spectrum?: string;

  // ===== 其他平台 =====
  /** Reddit */
  reddit?: string;
  /** Snapchat */
  snapchat?: string;
  /** VK */
  vk?: string;
  /** Patreon */
  patreon?: string;
  /** Product Hunt */
  productHunt?: string;

  // ===== 通用 =====
  /** Email */
  email?: string;
  /** RSS */
  rss?: string;
  /** Website 个人网站 */
  website?: string;
}

export interface SocialLinksBlockContent extends SocialPlatformLinks {
  /** 顶部标题 */
  header?: string;
  /** 底部文本 */
  footer?: string;
  /** 布局配置 */
  layout?: {
    /** 样式：icons-only / icons-with-text / text-only */
    style?: "icons-only" | "icons-with-text" | "text-only";
    /** 宽高比 */
    ratio?: number;
    /** Marquee 行数 */
    rows?: number;
    /** 滚动速度 */
    speed?: number;
  };
  [key: string]: unknown;
}

export interface SocialLinksBlockConfig extends BaseBlockConfig {
  block: "social-links";
  content: SocialLinksBlockContent;
}
