/**
 * PWA Manifest 动态生成器
 * 从数据库配置生成符合 Web App Manifest 规范的 JSON
 */

import { getRawConfig } from "@/lib/server/config-cache";

// Manifest 配置映射表
const manifestConfigMap = {
  name: "site.title",
  shortName: "pwa.short_name",
  description: "seo.description",
  startUrl: "site.url",
  display: "pwa.display",
  orientation: "pwa.orientation",
  themeColor: "site.color",
  backgroundColor: "site.color",
  categories: "pwa.categories",
  enabled: "pwa.enabled",
} as const;

// 配置值类型定义
interface ConfigValue {
  default?:
    | string
    | number
    | boolean
    | string[]
    | Record<string, unknown>
    | Array<Record<string, unknown>>
    | null;
  [key: string]: unknown;
}

// PWA Manifest 类型定义
interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

interface ManifestShortcut {
  name: string;
  short_name?: string;
  description?: string;
  url: string;
  icons?: ManifestIcon[];
}

interface WebAppManifest {
  name: string;
  short_name: string;
  description?: string;
  start_url: string;
  scope?: string;
  display: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  orientation?: "any" | "natural" | "landscape" | "portrait";
  theme_color?: string;
  background_color?: string;
  icons: ManifestIcon[];
  categories?: string[];
  shortcuts?: ManifestShortcut[];
  lang?: string;
  dir?: "ltr" | "rtl" | "auto";
}

// 辅助函数：获取字符串配置值
function getStringValue(
  configValue: ConfigValue | undefined,
  fallback: string = "",
): string {
  return typeof configValue?.default === "string"
    ? configValue.default
    : fallback;
}

// 辅助函数：获取对象配置值
function getObjectValue(
  configValue: ConfigValue | undefined,
): Record<string, unknown> | undefined {
  const value = configValue?.default;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

// 辅助函数：获取字符串数组配置值
function getStringArrayValue(
  configValue: ConfigValue | undefined,
  fallback: string[] = [],
): string[] {
  const value = configValue?.default;
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return fallback;
}

/**
 * 生成标准的图标数组
 * 图标路径格式: /icon/{size}x
 * 自动添加 .png 扩展名
 */
function generateIcons(): ManifestIcon[] {
  const sizes = [16, 32, 48, 72, 96, 128, 144, 192, 256, 384, 512];

  return sizes.map((size) => ({
    src: `/icon/${size}x`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose: size >= 192 ? "any maskable" : "any",
  }));
}

/**
 * 生成快捷方式数组
 * 基于 default-menus.ts 中的常用菜单项
 */
function generateShortcuts(baseUrl: string): ManifestShortcut[] {
  // 浏览类快捷方式（从 MAIN 菜单选择常用项）
  const shortcuts: ManifestShortcut[] = [
    {
      name: "首页",
      short_name: "首页",
      description: "返回网站首页",
      url: baseUrl + "/",
      icons: [
        {
          src: "/icon/96x.png",
          sizes: "96x96",
          type: "image/png",
        },
      ],
    },
    {
      name: "文章",
      short_name: "文章",
      description: "浏览所有文章",
      url: baseUrl + "/posts",
      icons: [
        {
          src: "/icon/96x.png",
          sizes: "96x96",
          type: "image/png",
        },
      ],
    },
    {
      name: "分类",
      short_name: "分类",
      description: "浏览文章分类",
      url: baseUrl + "/categories",
      icons: [
        {
          src: "/icon/96x.png",
          sizes: "96x96",
          type: "image/png",
        },
      ],
    },
    {
      name: "标签",
      short_name: "标签",
      description: "浏览文章标签",
      url: baseUrl + "/tags",
      icons: [
        {
          src: "/icon/96x.png",
          sizes: "96x96",
          type: "image/png",
        },
      ],
    },
    // TODO: 添加管理类快捷方式
    // 例如：写文章、管理后台等
    // 需要考虑未登录用户的体验
  ];

  return shortcuts;
}

/**
 * 生成 PWA Manifest
 * 从数据库配置动态生成符合规范的 manifest 对象
 */
export async function generateManifest(): Promise<WebAppManifest> {
  // 批量获取所有需要的配置
  const configKeys = Object.values(manifestConfigMap);
  const configs = await Promise.all(configKeys.map((key) => getRawConfig(key)));

  // 构建配置映射
  const configValues = Object.fromEntries(
    configKeys.map((key, index) => [
      key,
      configs[index]?.value as ConfigValue | undefined,
    ]),
  ) as Record<string, ConfigValue | undefined>;

  // 检查是否启用 PWA
  const enabled = configValues[manifestConfigMap.enabled]?.default;
  if (enabled === false) {
    // 返回最小化的 manifest
    return {
      name: "NeutralPress",
      short_name: "NeutralPress",
      start_url: "/",
      display: "browser",
      icons: generateIcons(),
    };
  }

  // 动态获取的值
  const name = getStringValue(configValues[manifestConfigMap.name]);
  const shortName = getStringValue(configValues[manifestConfigMap.shortName]);
  const description = getStringValue(
    configValues[manifestConfigMap.description],
  );
  const startUrl = getStringValue(configValues[manifestConfigMap.startUrl]);
  const display = getStringValue(configValues[manifestConfigMap.display]);
  const orientation = getStringValue(
    configValues[manifestConfigMap.orientation],
  );
  const colorConfig = getObjectValue(
    configValues[manifestConfigMap.themeColor],
  );
  const categories = getStringArrayValue(
    configValues[manifestConfigMap.categories],
  );

  // 提取主题色
  const themeColor =
    typeof colorConfig?.primary === "string" ? colorConfig.primary : "#2dd4bf";

  // 提取背景色（浅色模式）
  const backgroundColor =
    typeof colorConfig?.background === "object" &&
    colorConfig.background !== null &&
    typeof (colorConfig.background as Record<string, unknown>).light ===
      "string"
      ? (colorConfig.background as Record<string, unknown>).light
      : "#ffffff";

  // 构建最终的 manifest
  const manifest: WebAppManifest = {
    name: name || "NeutralPress",
    short_name: shortName || name || "NeutralPress",
    description: description || undefined,
    start_url: startUrl || "/",
    scope: "/",
    display: (display as WebAppManifest["display"]) || "standalone",
    orientation: (orientation as WebAppManifest["orientation"]) || "any",
    theme_color: themeColor,
    background_color: backgroundColor as string,
    icons: generateIcons(),
    lang: "zh-CN",
    dir: "ltr",
  };

  // 添加可选字段
  if (categories.length > 0) {
    manifest.categories = categories;
  }

  // 添加快捷方式
  if (startUrl) {
    manifest.shortcuts = generateShortcuts(startUrl);
  }

  return manifest;
}
