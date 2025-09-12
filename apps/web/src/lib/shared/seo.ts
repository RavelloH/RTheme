// SEO 相关库
import type { Metadata } from "next";
import { getConfig } from "@/lib/server/configCache";

// 默认值常量
const DEFAULT_URL = "https://example.com";
const DEFAULT_TITLE = "NeutralPress";
const DEFAULT_DESCRIPTION = "现代化的内容管理系统";
const DEFAULT_AUTHOR = "NeutralPress Team";
const DEFAULT_LOCALE = "zh-CN";
const DEFAULT_THEME_COLOR = "#000000";

// 默认SEO配置
export const defaultMetadata: Metadata = {
  metadataBase: new URL(DEFAULT_URL),
  title: {
    template: "%s | " + DEFAULT_TITLE,
    default: DEFAULT_TITLE,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: DEFAULT_TITLE,
  generator: "NeutralPress",
  referrer: "strict-origin-when-cross-origin",
  authors: [{ name: DEFAULT_AUTHOR }],
  creator: DEFAULT_AUTHOR,
  publisher: DEFAULT_AUTHOR,
  category: "Technology",
  classification: "CMS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
    languages: {
      "zh-CN": "/",
      "en-US": "/en",
    },
    types: {
      "application/rss+xml": "/rss.xml",
      "application/atom+xml": "/atom.xml",
    },
    media: {
      "only screen and (max-width: 600px)": "/mobile",
    },
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/apple-touch-icon-precomposed.png",
    },
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: DEFAULT_LOCALE,
    alternateLocale: ["en-US"],
    title: {
      template: "%s | " + DEFAULT_TITLE,
      default: DEFAULT_TITLE,
    },
    description: DEFAULT_DESCRIPTION,
    siteName: DEFAULT_TITLE,
    url: DEFAULT_URL,
    countryName: "China",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: DEFAULT_TITLE + " - " + DEFAULT_DESCRIPTION,
        type: "image/png",
      },
    ],
    videos: [],
    audio: [],
    determiner: "auto",
  },
  twitter: {
    card: "summary_large_image",
    site: "@neutralpress",
    creator: "@neutralpress",
    title: {
      template: "%s | " + DEFAULT_TITLE,
      default: DEFAULT_TITLE,
    },
    description: DEFAULT_DESCRIPTION,
    images: {
      url: "/twitter-card.png",
      alt: DEFAULT_TITLE + " Twitter Card",
      width: 1200,
      height: 630,
    },
  },
  verification: {
    google: "",
    yandex: "",
    yahoo: "",
    other: {
      me: [""],
    },
  },
  appleWebApp: {
    capable: true,
    title: DEFAULT_TITLE,
    statusBarStyle: "black-translucent",
  },
  appLinks: {
    web: {
      url: DEFAULT_URL,
      should_fallback: true,
    },
  },
  bookmarks: [DEFAULT_URL],
  keywords: [
    "CMS",
    "博客",
    "内容管理",
    "Next.js",
    "React",
    "TypeScript",
    "Prisma",
    "PostgreSQL",
    "开源",
    "现代化",
    "响应式",
    "SEO优化",
  ],
  other: {
    "theme-color": DEFAULT_THEME_COLOR,
    "msapplication-TileColor": DEFAULT_THEME_COLOR,
    "msapplication-config": "/browserconfig.xml",
    "apple-mobile-web-app-title": DEFAULT_TITLE,
    "application-name": DEFAULT_TITLE,
    "mobile-web-app-capable": "yes",
  },
};

// SEO配置映射表
const seoConfigMap = {
  metadataBase: "site.url",
  title: "site.title",
  description: "site.seo.description",
  applicationName: "site.title",
  keywords: "site.seo.keywords",
  author: "site.author",
  themeColor: "site.theme_color",
  locale: "site.seo.locale",
  twitterSite: "site.seo.twitter_site",
  twitterCreator: "site.seo.twitter_creator",
  googleVerification: "site.seo.google_verification",
  category: "site.seo.category",
  country: "site.seo.country",
} as const;

// 生成动态SEO配置的异步函数
export async function generateMetadata(
  overrides: Partial<Metadata> = {}
): Promise<Metadata> {
  // 批量获取所有需要的配置
  const configKeys = Object.values(seoConfigMap);
  const configs = await Promise.all(configKeys.map((key) => getConfig(key)));

  // 构建配置映射
  const configValues = Object.fromEntries(
    configKeys.map((key, index) => [key, configs[index]?.value])
  );

  // 动态获取的值
  const dynamicUrl = configValues[seoConfigMap.metadataBase] as string;
  const dynamicTitle = configValues[seoConfigMap.title] as string;
  const dynamicDescription = configValues[seoConfigMap.description] as string;
  const dynamicAppName = configValues[seoConfigMap.applicationName] as string;
  const dynamicKeywords = configValues[seoConfigMap.keywords] as string;
  const dynamicAuthor = configValues[seoConfigMap.author] as string;
  const dynamicThemeColor = configValues[seoConfigMap.themeColor] as string;
  const dynamicLocale = configValues[seoConfigMap.locale] as string;
  const dynamicTwitterSite = configValues[seoConfigMap.twitterSite] as string;
  const dynamicTwitterCreator = configValues[seoConfigMap.twitterCreator] as string;
  const dynamicGoogleVerification = configValues[seoConfigMap.googleVerification] as string;
  const dynamicCategory = configValues[seoConfigMap.category] as string;
  const dynamicCountry = configValues[seoConfigMap.country] as string;

  // 构建最终的metadata
  const dynamicMetadata: Metadata = {
    metadataBase: dynamicUrl ? new URL(dynamicUrl) : defaultMetadata.metadataBase,
    title: {
      template: `%s | ${dynamicTitle || DEFAULT_TITLE}`,
      default: dynamicTitle || DEFAULT_TITLE,
    },
    description: dynamicDescription || defaultMetadata.description,
    applicationName: dynamicAppName || defaultMetadata.applicationName,
    generator: defaultMetadata.generator,
    referrer: defaultMetadata.referrer,
    authors: [{ name: dynamicAuthor || DEFAULT_AUTHOR }],
    creator: dynamicAuthor || DEFAULT_AUTHOR,
    publisher: dynamicAuthor || DEFAULT_AUTHOR,
    category: dynamicCategory || defaultMetadata.category,
    classification: defaultMetadata.classification,
    formatDetection: defaultMetadata.formatDetection,
    alternates: {
      ...defaultMetadata.alternates,
      canonical: "/",
    },
    robots: defaultMetadata.robots,
    icons: defaultMetadata.icons,
    manifest: defaultMetadata.manifest,
    openGraph: {
      ...defaultMetadata.openGraph,
      title: {
        template: `%s | ${dynamicTitle || DEFAULT_TITLE}`,
        default: dynamicTitle || DEFAULT_TITLE,
      },
      description: dynamicDescription || DEFAULT_DESCRIPTION,
      siteName: dynamicAppName || dynamicTitle || DEFAULT_TITLE,
      url: dynamicUrl || DEFAULT_URL,
      locale: (dynamicLocale || DEFAULT_LOCALE) as "zh-CN" | "en-US",
      countryName: dynamicCountry || defaultMetadata.openGraph?.countryName,
    },
    twitter: {
      ...defaultMetadata.twitter,
      site: dynamicTwitterSite || defaultMetadata.twitter?.site,
      creator: dynamicTwitterCreator || defaultMetadata.twitter?.creator,
      title: {
        template: `%s | ${dynamicTitle || DEFAULT_TITLE}`,
        default: dynamicTitle || DEFAULT_TITLE,
      },
      description: dynamicDescription || DEFAULT_DESCRIPTION,
    },
    verification: {
      ...defaultMetadata.verification,
      google: dynamicGoogleVerification || defaultMetadata.verification?.google,
    },
    keywords: dynamicKeywords
      ? dynamicKeywords.split(",").map((k) => k.trim())
      : defaultMetadata.keywords,
    other: {
      "theme-color": dynamicThemeColor || DEFAULT_THEME_COLOR,
      "msapplication-TileColor": dynamicThemeColor || DEFAULT_THEME_COLOR,
      "msapplication-config": "/browserconfig.xml",
      "apple-mobile-web-app-title": dynamicAppName || dynamicTitle || DEFAULT_TITLE,
      "application-name": dynamicAppName || dynamicTitle || DEFAULT_TITLE,
      "mobile-web-app-capable": "yes",
    },
  };

  return {
    ...dynamicMetadata,
    ...overrides, // 允许页面级别的覆盖
  };
}
