import {
  RiBehanceFill,
  RiBilibiliFill,
  RiBloggerFill,
  RiBlueskyFill,
  RiCodepenFill,
  RiDiscordFill,
  RiDisqusFill,
  RiDoubanFill,
  RiDribbbleFill,
  RiDropboxFill,
  RiFacebookCircleFill,
  RiFediverseFill,
  RiFigmaFill,
  RiFiverrFill,
  RiFlickrFill,
  RiFriendicaFill,
  RiGitbookFill,
  RiGiteeFill,
  RiGithubFill,
  RiGitlabFill,
  RiGlobalLine,
  RiInstagramFill,
  RiKakaoTalkFill,
  RiKickFill,
  RiLineFill,
  RiLinkedinBoxFill,
  RiMailFill,
  RiMastodonFill,
  RiMediumFill,
  RiMessengerFill,
  RiNeteaseCloudMusicFill,
  RiNotionFill,
  RiNpmjsFill,
  RiPatreonFill,
  RiPinterestFill,
  RiPixelfedFill,
  RiPlaystationFill,
  RiProductHuntFill,
  RiQqFill,
  RiRedditFill,
  RiRssFill,
  RiSkypeFill,
  RiSlackFill,
  RiSnapchatFill,
  RiSoundcloudFill,
  RiSpectrumFill,
  RiSpotifyFill,
  RiStackOverflowFill,
  RiStackshareFill,
  RiSteamFill,
  RiSwitchFill,
  RiTelegramFill,
  RiThreadsFill,
  RiTiktokFill,
  RiTrelloFill,
  RiTumblrFill,
  RiTwitchFill,
  RiTwitterXFill,
  RiUnsplashFill,
  RiUpworkFill,
  RiVercelFill,
  RiVimeoFill,
  RiVkFill,
  RiWechatChannelsFill,
  RiWechatFill,
  RiWeiboFill,
  RiWhatsappFill,
  RiWordpressFill,
  RiXboxFill,
  RiXingFill,
  RiYoutubeFill,
  RiYuqueFill,
  RiZcoolFill,
  RiZhihuFill,
} from "@remixicon/react";

import SocialLinksMarquee, {
  type SocialLinkData,
} from "@/blocks/collection/SocialLinks/client/SocialLinksMarquee";
import type { SocialLinksBlockConfig } from "@/blocks/collection/SocialLinks/types";
import { ProcessedText } from "@/blocks/core/components";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";

/**
 * 平台配置接口
 */
interface PlatformConfig {
  /** 图标组件 */
  icon: React.ComponentType<{ className?: string }>;
  /** 显示名称 */
  label: string;
}

/**
 * 平台图标和名称映射
 * 键名对应 content 中的字段名
 */
const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  // 核心社交媒体
  twitter: { icon: RiTwitterXFill, label: "Twitter" },
  facebook: { icon: RiFacebookCircleFill, label: "Facebook" },
  instagram: { icon: RiInstagramFill, label: "Instagram" },
  threads: { icon: RiThreadsFill, label: "Threads" },
  bluesky: { icon: RiBlueskyFill, label: "Bluesky" },
  mastodon: { icon: RiMastodonFill, label: "Mastodon" },
  fediverse: { icon: RiFediverseFill, label: "Fediverse" },
  friendica: { icon: RiFriendicaFill, label: "Friendica" },

  // 视频平台
  youtube: { icon: RiYoutubeFill, label: "YouTube" },
  bilibili: { icon: RiBilibiliFill, label: "Bilibili" },
  tiktok: { icon: RiTiktokFill, label: "TikTok" },
  twitch: { icon: RiTwitchFill, label: "Twitch" },
  vimeo: { icon: RiVimeoFill, label: "Vimeo" },
  kick: { icon: RiKickFill, label: "Kick" },
  wechatChannels: { icon: RiWechatChannelsFill, label: "视频号" },

  // 专业社交
  linkedin: { icon: RiLinkedinBoxFill, label: "LinkedIn" },
  xing: { icon: RiXingFill, label: "Xing" },

  // 即时通讯
  discord: { icon: RiDiscordFill, label: "Discord" },
  telegram: { icon: RiTelegramFill, label: "Telegram" },
  whatsapp: { icon: RiWhatsappFill, label: "WhatsApp" },
  line: { icon: RiLineFill, label: "Line" },
  messenger: { icon: RiMessengerFill, label: "Messenger" },
  wechat: { icon: RiWechatFill, label: "微信" },
  qq: { icon: RiQqFill, label: "QQ" },
  kakaoTalk: { icon: RiKakaoTalkFill, label: "KakaoTalk" },
  skype: { icon: RiSkypeFill, label: "Skype" },
  slack: { icon: RiSlackFill, label: "Slack" },

  // 开发者平台
  github: { icon: RiGithubFill, label: "GitHub" },
  gitee: { icon: RiGiteeFill, label: "Gitee" },
  gitlab: { icon: RiGitlabFill, label: "GitLab" },
  codepen: { icon: RiCodepenFill, label: "CodePen" },
  stackOverflow: { icon: RiStackOverflowFill, label: "Stack Overflow" },
  npmjs: { icon: RiNpmjsFill, label: "npm" },
  vercel: { icon: RiVercelFill, label: "Vercel" },
  stackshare: { icon: RiStackshareFill, label: "StackShare" },

  // 内容/博客平台
  medium: { icon: RiMediumFill, label: "Medium" },
  tumblr: { icon: RiTumblrFill, label: "Tumblr" },
  zhihu: { icon: RiZhihuFill, label: "知乎" },
  douban: { icon: RiDoubanFill, label: "豆瓣" },
  weibo: { icon: RiWeiboFill, label: "微博" },
  blogger: { icon: RiBloggerFill, label: "Blogger" },
  wordpress: { icon: RiWordpressFill, label: "WordPress" },
  notion: { icon: RiNotionFill, label: "Notion" },
  yuque: { icon: RiYuqueFill, label: "语雀" },
  gitbook: { icon: RiGitbookFill, label: "GitBook" },
  disqus: { icon: RiDisqusFill, label: "Disqus" },

  // 设计平台
  dribbble: { icon: RiDribbbleFill, label: "Dribbble" },
  behance: { icon: RiBehanceFill, label: "Behance" },
  zcool: { icon: RiZcoolFill, label: "站酷" },
  figma: { icon: RiFigmaFill, label: "Figma" },

  // 音乐平台
  spotify: { icon: RiSpotifyFill, label: "Spotify" },
  soundcloud: { icon: RiSoundcloudFill, label: "SoundCloud" },
  neteaseMusic: { icon: RiNeteaseCloudMusicFill, label: "网易云音乐" },

  // 图片分享
  pinterest: { icon: RiPinterestFill, label: "Pinterest" },
  flickr: { icon: RiFlickrFill, label: "Flickr" },
  unsplash: { icon: RiUnsplashFill, label: "Unsplash" },
  pixelfed: { icon: RiPixelfedFill, label: "Pixelfed" },

  // 自由职业平台
  fiverr: { icon: RiFiverrFill, label: "Fiverr" },
  upwork: { icon: RiUpworkFill, label: "Upwork" },

  // 游戏平台
  steam: { icon: RiSteamFill, label: "Steam" },
  xbox: { icon: RiXboxFill, label: "Xbox" },
  playstation: { icon: RiPlaystationFill, label: "PlayStation" },
  switchNintendo: { icon: RiSwitchFill, label: "Switch" },

  // 协作工具
  trello: { icon: RiTrelloFill, label: "Trello" },
  dropbox: { icon: RiDropboxFill, label: "Dropbox" },
  spectrum: { icon: RiSpectrumFill, label: "Spectrum" },

  // 其他平台
  reddit: { icon: RiRedditFill, label: "Reddit" },
  snapchat: { icon: RiSnapchatFill, label: "Snapchat" },
  vk: { icon: RiVkFill, label: "VK" },
  patreon: { icon: RiPatreonFill, label: "Patreon" },
  productHunt: { icon: RiProductHuntFill, label: "Product Hunt" },

  // 通用
  email: { icon: RiMailFill, label: "Email" },
  rss: { icon: RiRssFill, label: "RSS" },
  website: { icon: RiGlobalLine, label: "网站" },
};

/**
 * 平台字段列表（用于遍历）
 * 顺序决定显示顺序
 */
const PLATFORM_KEYS = [
  // 核心社交媒体
  "twitter",
  "facebook",
  "instagram",
  "threads",
  "bluesky",
  "mastodon",
  "fediverse",
  "friendica",
  // 视频平台
  "youtube",
  "bilibili",
  "tiktok",
  "twitch",
  "vimeo",
  "kick",
  "wechatChannels",
  // 专业社交
  "linkedin",
  "xing",
  // 即时通讯
  "discord",
  "telegram",
  "whatsapp",
  "line",
  "messenger",
  "wechat",
  "qq",
  "kakaoTalk",
  "skype",
  "slack",
  // 开发者平台
  "github",
  "gitee",
  "gitlab",
  "codepen",
  "stackOverflow",
  "npmjs",
  "vercel",
  "stackshare",
  // 内容/博客平台
  "medium",
  "tumblr",
  "zhihu",
  "douban",
  "weibo",
  "blogger",
  "wordpress",
  "notion",
  "yuque",
  "gitbook",
  "disqus",
  // 设计平台
  "dribbble",
  "behance",
  "zcool",
  "figma",
  // 音乐平台
  "spotify",
  "soundcloud",
  "neteaseMusic",
  // 图片分享
  "pinterest",
  "flickr",
  "unsplash",
  "pixelfed",
  // 自由职业平台
  "fiverr",
  "upwork",
  // 游戏平台
  "steam",
  "xbox",
  "playstation",
  "switchNintendo",
  // 协作工具
  "trello",
  "dropbox",
  "spectrum",
  // 其他平台
  "reddit",
  "snapchat",
  "vk",
  "patreon",
  "productHunt",
  // 通用
  "email",
  "rss",
  "website",
] as const;

/**
 * SocialLinksBlock - 服务端组件
 * 展示社交媒体链接（多行 Marquee 滚动）
 */
export default function SocialLinksBlock({ block }: BlockComponentProps) {
  const content = block.content as SocialLinksBlockConfig["content"];
  const data = getBlockRuntimeData(block.runtime);

  const header = content.header || "";
  const footer = content.footer || "";
  const style = content.layout?.style || "icons-with-text";
  const ratio = content.layout?.ratio ?? 0.8;
  const rows = content.layout?.rows ?? 2;
  const speed = content.layout?.speed ?? 30;

  const hasHeader = !!header;
  const hasFooter = !!footer;

  // 收集所有有 URL 的平台，生成带图标的数据
  const activeLinks: SocialLinkData[] = [];

  for (const key of PLATFORM_KEYS) {
    const url = content[key];
    if (url && typeof url === "string" && url.trim()) {
      const platformConfig = PLATFORM_CONFIG[key];
      if (platformConfig) {
        const IconComponent = platformConfig.icon;
        activeLinks.push({
          platform: key,
          url: url.trim(),
          label: platformConfig.label,
          icon: <IconComponent className="w-full h-full" />,
        });
      }
    }
  }

  return (
    <RowGrid>
      {/* 顶部标题 */}
      {hasHeader && (
        <GridItem
          areas={[1, 2]}
          width={(ratio * 14) / 2}
          height={0.1}
          className="flex items-center justify-center px-10 uppercase text-2xl tracking-[0.3em] bg-primary text-primary-foreground"
        >
          <div data-fade-char>
            <ProcessedText text={header} data={data} inline />
          </div>
        </GridItem>
      )}

      {/* Marquee 链接列表 */}
      <GridItem
        areas={
          hasHeader && hasFooter
            ? [3, 4, 5, 6, 7, 8, 9, 10]
            : hasHeader
              ? [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
              : hasFooter
                ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
                : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        }
        width={
          (ratio * 14) /
          (hasHeader && hasFooter ? 8 : hasHeader ? 10 : hasFooter ? 10 : 12)
        }
        height={1}
        className="flex items-center justify-center overflow-hidden px-px"
      >
        <SocialLinksMarquee
          links={activeLinks}
          style={style}
          rows={rows}
          speed={speed}
        />
      </GridItem>

      {/* 底部文本 */}
      {hasFooter && (
        <GridItem
          areas={[11, 12]}
          width={(ratio * 14) / 2}
          height={0.1}
          className="flex items-center justify-center px-10 text-xl text-muted-foreground"
        >
          <div data-line-reveal>
            <ProcessedText text={footer} data={data} inline />
          </div>
        </GridItem>
      )}
    </RowGrid>
  );
}
