import React, { useEffect, useState } from "react";
import type { RemixiconComponentType } from "@remixicon/react";

// URL匹配规则和对应图标名称
const iconMappings = [
  // 代码与开发平台
  { patterns: ["github.com", "gist.github.com"], iconName: "RiGithubFill" },
  { patterns: ["gitlab.com", "gitlab.io"], iconName: "RiGitlabFill" },
  {
    patterns: ["stackoverflow.com", "stackexchange.com"],
    iconName: "RiStackOverflowFill",
  },
  { patterns: ["codepen.io"], iconName: "RiCodepenFill" },
  { patterns: ["codesandbox.io"], iconName: "RiCodeBoxFill" },
  { patterns: ["npmjs.com"], iconName: "RiNpmjsFill" },
  { patterns: ["yarnpkg.com"], iconName: "RiNpmjsFill" },
  { patterns: ["pnpm.io"], iconName: "RiNpmjsFill" },

  // 技术文档与框架
  { patterns: ["reactjs.org", "react.dev"], iconName: "RiReactjsFill" },
  { patterns: ["vuejs.org"], iconName: "RiVuejsFill" },
  { patterns: ["nextjs.org"], iconName: "RiNextjsFill" },
  { patterns: ["nodejs.org"], iconName: "RiNodejsFill" },
  { patterns: ["tailwindcss.com"], iconName: "RiTailwindCssFill" },

  // 云服务与部署
  { patterns: ["vercel.com", "vercel.app"], iconName: "RiVercelFill" },
  { patterns: ["firebase.google.com"], iconName: "RiFirebaseFill" },
  { patterns: ["aws.amazon.com", "amazonaws.com"], iconName: "RiAmazonFill" },
  { patterns: ["google.com"], iconName: "RiGoogleFill" },
  { patterns: ["microsoft.com"], iconName: "RiMicrosoftFill" },
  { patterns: ["apple.com"], iconName: "RiAppleFill" },

  // 设计与创意
  { patterns: ["figma.com"], iconName: "RiFigmaFill" },
  { patterns: ["dribbble.com"], iconName: "RiDribbbleFill" },
  { patterns: ["behance.net"], iconName: "RiBehanceFill" },

  // 社交媒体
  { patterns: ["twitter.com", "x.com"], iconName: "RiTwitterXFill" },
  { patterns: ["linkedin.com"], iconName: "RiLinkedinFill" },
  { patterns: ["facebook.com"], iconName: "RiFacebookFill" },
  { patterns: ["instagram.com"], iconName: "RiInstagramFill" },
  { patterns: ["youtube.com", "youtu.be"], iconName: "RiYoutubeFill" },
  { patterns: ["medium.com"], iconName: "RiMediumFill" },
  { patterns: ["reddit.com"], iconName: "RiRedditFill" },
  { patterns: ["discord.com", "discord.gg"], iconName: "RiDiscordFill" },
  { patterns: ["telegram.org", "t.me"], iconName: "RiTelegramFill" },
  { patterns: ["whatsapp.com", "wa.me"], iconName: "RiWhatsappFill" },
  { patterns: ["skype.com"], iconName: "RiSkypeFill" },
  { patterns: ["snapchat.com"], iconName: "RiSnapchatFill" },
  { patterns: ["threads.net"], iconName: "RiThreadsFill" },
  { patterns: ["twitch.tv"], iconName: "RiTwitchFill" },
  { patterns: ["bsky.app", "bluesky.social"], iconName: "RiBlueskyFill" },
  { patterns: ["messenger.com", "m.me"], iconName: "RiMessengerFill" },
  { patterns: ["kakaotalk.com", "kakao.com"], iconName: "RiKakaoTalkFill" },
  { patterns: ["line.me"], iconName: "RiLineFill" },

  // 中文平台
  { patterns: ["bilibili.com"], iconName: "RiBilibiliFill" },
  { patterns: ["zhihu.com"], iconName: "RiZhihuFill" },
  { patterns: ["weibo.com"], iconName: "RiWeiboFill" },
  { patterns: ["taobao.com"], iconName: "RiTaobaoFill" },
  { patterns: ["dingtalk.com"], iconName: "RiDingdingFill" },
  { patterns: ["qq.com"], iconName: "RiQqFill" },
  { patterns: ["wechat.com", "weixin.qq.com"], iconName: "RiWechatFill" },
  { patterns: ["channels.weixin.qq.com"], iconName: "RiWechatChannelsFill" },
  { patterns: ["pay.weixin.qq.com"], iconName: "RiWechatPayFill" },
  { patterns: ["tiktok.com", "douyin.com"], iconName: "RiTiktokFill" },
  { patterns: ["alipay.com"], iconName: "RiAlipayFill" },
  { patterns: ["douban.com"], iconName: "RiDoubanFill" },
  { patterns: ["baidu.com"], iconName: "RiBaiduFill" },
  {
    patterns: ["aliyun.com", "alibabacloud.com"],
    iconName: "RiAlibabaCloudFill",
  },
  {
    patterns: ["music.163.com", "y.music.163.com"],
    iconName: "RiNeteaseCloudMusicFill",
  },
  { patterns: ["yuque.com"], iconName: "RiYuqueFill" },
  { patterns: ["zcool.com.cn"], iconName: "RiZcoolFill" },

  // 工具与服务
  { patterns: ["notion.so"], iconName: "RiNotionFill" },
  { patterns: ["slack.com"], iconName: "RiSlackFill" },
  { patterns: ["trello.com"], iconName: "RiTrelloFill" },
  { patterns: ["dropbox.com"], iconName: "RiDropboxFill" },
  { patterns: ["paypal.com"], iconName: "RiPaypalFill" },

  // 浏览器
  { patterns: ["chrome.google.com"], iconName: "RiChromeFill" },
  { patterns: ["firefox.com"], iconName: "RiFirefoxFill" },
  { patterns: ["safari.apple.com"], iconName: "RiSafariFill" },
  { patterns: ["edge.microsoft.com"], iconName: "RiEdgeFill" },

  // 内容与娱乐
  { patterns: ["spotify.com"], iconName: "RiMusic2Fill" },
  { patterns: ["netflix.com"], iconName: "RiMovie2Fill" },
  { patterns: ["steam.com"], iconName: "RiSteamFill" },
  { patterns: ["playstation.com"], iconName: "RiPlaystationFill" },

  // 学习与教育
  { patterns: ["w3schools.com"], iconName: "RiBook2Fill" },
  { patterns: ["coursera.org"], iconName: "RiArticleFill" },
  { patterns: ["udemy.com"], iconName: "RiArticleFill" },
];

// 获取域名
function getDomain(url: string): string {
  try {
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }
    const urlObj = new URL(url);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return "";
  }
}

// 匹配图标名称
function matchIconName(url: string): string | null {
  const domain = getDomain(url);

  for (const mapping of iconMappings) {
    for (const pattern of mapping.patterns) {
      if (domain.includes(pattern)) {
        return mapping.iconName;
      }
    }
  }

  return null;
}

// 动态加载图标组件
async function loadIconComponent(
  iconName: string,
): Promise<RemixiconComponentType | null> {
  try {
    const iconModule = await import("@remixicon/react");
    const component = iconModule[iconName as keyof typeof iconModule];
    return component as RemixiconComponentType;
  } catch (error) {
    console.error(`Failed to load icon: ${iconName}`, error);
    return null;
  }
}

// 动态图标组件
export function DynamicIcon({
  url,
  size = "1em",
  className = "",
}: {
  url: string;
  size?: string;
  className?: string;
}) {
  const [IconComponent, setIconComponent] =
    useState<RemixiconComponentType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const iconName = matchIconName(url);

    if (!iconName) {
      // 没有匹配的图标，不显示任何内容
      if (isMounted) {
        setIconComponent(null);
        setLoading(false);
      }
      return;
    }

    // 动态加载匹配的图标
    loadIconComponent(iconName).then((component) => {
      if (isMounted && component) {
        setIconComponent(() => component);
        setLoading(false);
      } else if (isMounted) {
        // 加载失败，不显示任何内容
        setIconComponent(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [url]);

  if (loading) {
    // 加载中显示占位符
    return (
      <span
        className={className}
        style={{ display: "inline-block", width: size, height: size }}
      />
    );
  }

  if (!IconComponent) {
    // 没有匹配的图标，不显示任何内容
    return null;
  }

  return <IconComponent size={size} className={className} />;
}

// 导出匹配函数供外部使用
export function matchDynamicIcon(url: string) {
  return matchIconName(url);
}
