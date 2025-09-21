// SEO 相关库
import type { Metadata } from "next";
import { getConfig } from "@/lib/server/configCache";

// 默认值常量
const DEFAULT_URL = "https://example.com";
const DEFAULT_TITLE = "NeutralPress";
const DEFAULT_DESCRIPTION = "现代化的内容管理系统";
const DEFAULT_AUTHOR = "RavelloH";
const DEFAULT_LOCALE = "zh-CN";
const DEFAULT_THEME_COLOR = "#2dd4bf";

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
    types: {
      "application/rss+xml": "/rss.xml",
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
  // TODO
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
  twitterSite: "site.seo.twitter_site",
  twitterCreator: "site.seo.twitter_creator",
  googleVerification: "site.seo.google_verification",
  category: "site.seo.category",
  country: "site.seo.country",
} as const;

// 配置值类型定义
interface ConfigValue {
  default?: string | number | boolean | string[] | null;
  [key: string]: unknown;
}

// 生成动态SEO配置的异步函数
export async function generateMetadata(
  overrides: Partial<Metadata> = {},
  options?: { pathname?: string }
): Promise<Metadata> {
  // 批量获取所有需要的配置
  const configKeys = Object.values(seoConfigMap);
  const configs = await Promise.all(configKeys.map((key) => getConfig(key)));

  // 构建配置映射
  const configValues = Object.fromEntries(
    configKeys.map((key, index) => [key, configs[index]?.value as ConfigValue | undefined])
  ) as Record<string, ConfigValue | undefined>;

  // 动态获取的值 - 适配新的 Object 格式
  const dynamicUrl = configValues[seoConfigMap.metadataBase]?.default || "";
  const dynamicTitle = configValues[seoConfigMap.title]?.default || "";
  const dynamicDescription = configValues[seoConfigMap.description]?.default || "";
  const dynamicAppName = configValues[seoConfigMap.applicationName]?.default || "";
  const dynamicKeywords = configValues[seoConfigMap.keywords]?.default || "";
  const dynamicAuthor = configValues[seoConfigMap.author]?.default || "";
  const dynamicThemeColor = configValues[seoConfigMap.themeColor]?.default || "";
  const dynamicTwitterSite = configValues[seoConfigMap.twitterSite]?.default || "";
  const dynamicTwitterCreator = configValues[seoConfigMap.twitterCreator]?.default || "";
  const dynamicGoogleVerification = configValues[seoConfigMap.googleVerification]?.default || "";
  const dynamicCategory = configValues[seoConfigMap.category]?.default || "";
  const dynamicCountry = configValues[seoConfigMap.country]?.default || "";

  // 构建最终的metadata
  const dynamicMetadata: Metadata = {
    metadataBase: typeof dynamicUrl === 'string' && dynamicUrl ? new URL(dynamicUrl) : defaultMetadata.metadataBase,
    title: {
      template: `%s | ${typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE}`,
      default: typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE,
    },
    description: typeof dynamicDescription === 'string' ? dynamicDescription : defaultMetadata.description,
    applicationName: typeof dynamicAppName === 'string' ? dynamicAppName : defaultMetadata.applicationName,
    generator: defaultMetadata.generator,
    referrer: defaultMetadata.referrer,
    authors: [{ name: typeof dynamicAuthor === 'string' ? dynamicAuthor : DEFAULT_AUTHOR }],
    creator: typeof dynamicAuthor === 'string' ? dynamicAuthor : DEFAULT_AUTHOR,
    publisher: typeof dynamicAuthor === 'string' ? dynamicAuthor : DEFAULT_AUTHOR,
    category: typeof dynamicCategory === 'string' ? dynamicCategory : defaultMetadata.category,
    classification: defaultMetadata.classification,
    formatDetection: defaultMetadata.formatDetection,
    alternates: {
      ...defaultMetadata.alternates,
      canonical: options?.pathname || "/",
    },
    robots: defaultMetadata.robots,
    icons: defaultMetadata.icons,
    manifest: defaultMetadata.manifest,
    openGraph: {
      ...defaultMetadata.openGraph,
      title: {
        template: `%s | ${typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE}`,
        default: typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE,
      },
      description: typeof dynamicDescription === 'string' ? dynamicDescription : DEFAULT_DESCRIPTION,
      siteName: typeof dynamicAppName === 'string' ? dynamicAppName : typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE,
      url: typeof dynamicUrl === 'string' ? dynamicUrl : DEFAULT_URL,
      countryName: typeof dynamicCountry === 'string' ? dynamicCountry : defaultMetadata.openGraph?.countryName,
    },
    twitter: {
      ...defaultMetadata.twitter,
      site: typeof dynamicTwitterSite === 'string' ? dynamicTwitterSite : defaultMetadata.twitter?.site,
      creator: typeof dynamicTwitterCreator === 'string' ? dynamicTwitterCreator : defaultMetadata.twitter?.creator,
      title: {
        template: `%s | ${typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE}`,
        default: typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE,
      },
      description: typeof dynamicDescription === 'string' ? dynamicDescription : DEFAULT_DESCRIPTION,
    },
    verification: {
      ...defaultMetadata.verification,
      google: typeof dynamicGoogleVerification === 'string' ? dynamicGoogleVerification : defaultMetadata.verification?.google,
    },
    keywords: dynamicKeywords && dynamicKeywords !== ""
      ? Array.isArray(dynamicKeywords) 
        ? dynamicKeywords 
        : (dynamicKeywords as string).split(",").map((k: string) => k.trim())
      : defaultMetadata.keywords,
    other: {
      "theme-color": typeof dynamicThemeColor === 'string' ? dynamicThemeColor : DEFAULT_THEME_COLOR,
      "msapplication-TileColor": typeof dynamicThemeColor === 'string' ? dynamicThemeColor : DEFAULT_THEME_COLOR,
      "msapplication-config": "/browserconfig.xml",
      "apple-mobile-web-app-title": typeof dynamicAppName === 'string' ? dynamicAppName : typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE,
      "application-name": typeof dynamicAppName === 'string' ? dynamicAppName : typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE,
      "mobile-web-app-capable": "yes",
    },
  };

  // 处理页面级别的标题覆盖
  const processedOverrides = { ...overrides };
  
  // 如果覆盖参数中包含标题，确保使用模板格式
  if (overrides.title) {
    const siteTitle = typeof dynamicTitle === 'string' ? dynamicTitle : DEFAULT_TITLE;
    
    if (typeof overrides.title === 'string') {
      // 如果是字符串标题，应用模板格式
      processedOverrides.title = `${overrides.title} | ${siteTitle}`;
    } else if (overrides.title && typeof overrides.title === 'object') {
      // 如果是对象格式，处理模板和默认值
      const titleObj = overrides.title as Record<string, unknown>;
      const newTitle: Record<string, unknown> = {};
      
      if ('template' in titleObj && titleObj.template) {
        newTitle.template = titleObj.template;
      }
      if ('default' in titleObj && titleObj.default) {
        newTitle.default = `${titleObj.default} | ${siteTitle}`;
      }
      if ('absolute' in titleObj) {
        newTitle.absolute = titleObj.absolute;
      }
      
      if (Object.keys(newTitle).length > 0) {
        processedOverrides.title = newTitle as Metadata['title'];
      }
    }
  }

  return {
    ...dynamicMetadata,
    ...processedOverrides,
  };
}
