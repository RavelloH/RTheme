import "server-only";

import fs from "fs";
import path from "path";

// 配置对象类型定义
export interface ConfigItem {
  key: string;
  value: unknown;
  description?: string | null;
  updatedAt: Date;
}

// 缓存文件路径
const CACHE_FILE_PATH = path.join(
  process.cwd(),
  ".cache",
  ".config-cache.json",
);

/**
 * 获取配置项
 * 在开发环境中直接从数据库读取
 * 在生产环境中从缓存文件读取
 */
export async function getConfig(key: string): Promise<ConfigItem | null> {
  // 检查是否为敏感配置
  if (key.startsWith("secret.")) {
    console.warn(`拒绝访问敏感配置: ${key}`);
    return null;
  }

  if (process.env.NODE_ENV === "production") {
    return getConfigFromCache(key);
  } else {
    return getConfigFromDatabase(key);
  }
}

/**
 * 从数据库获取配置
 */
async function getConfigFromDatabase(key: string): Promise<ConfigItem | null> {
  try {
    const { default: prisma } = await import("./prisma");
    const config = await prisma.config.findUnique({
      where: { key },
    });

    if (!config) {
      return null;
    }

    return {
      key: config.key,
      value: config.value,
      description: undefined, // 移除描述字段
      updatedAt: config.updatedAt,
    };
  } catch (error) {
    console.error("从数据库获取配置失败:", error);
    return null;
  }
}

/**
 * 从缓存文件获取配置
 */
function getConfigFromCache(key: string): ConfigItem | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      console.warn("配置缓存文件不存在:", CACHE_FILE_PATH);
      return null;
    }

    const cacheData = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const configs: Record<string, ConfigItem> = JSON.parse(cacheData);

    const config = configs[key];
    if (!config) {
      return null;
    }

    // 确保 updatedAt 是 Date 对象并移除描述字段
    return {
      ...config,
      description: undefined, // 移除描述字段
      updatedAt: new Date(config.updatedAt),
    };
  } catch (error) {
    console.error("从缓存文件读取配置失败:", error);
    return null;
  }
}

/**
 * 获取所有配置项（主要用于客户端）
 * 过滤掉 secret 开头的敏感配置项和 description 字段
 */
export async function getAllConfigs(): Promise<Record<string, ConfigItem>> {
  const allConfigs =
    process.env.NODE_ENV === "production"
      ? getAllConfigsFromCache()
      : await getAllConfigsFromDatabase();

  return filterSensitiveConfigs(allConfigs);
}

/**
 * 过滤敏感配置项
 * 移除 secret 开头的配置项和所有配置的 description 字段
 */
function filterSensitiveConfigs(
  configs: Record<string, ConfigItem>,
): Record<string, ConfigItem> {
  const filteredConfigs: Record<string, ConfigItem> = {};

  Object.entries(configs).forEach(([key, config]) => {
    // 跳过 secret 开头的敏感配置
    if (key.startsWith("secret.")) {
      return;
    }

    // 移除 description 字段
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description, ...safeConfig } = config;

    filteredConfigs[key] = {
      ...safeConfig,
      description: undefined,
    };
  });

  return filteredConfigs;
}

/**
 * 从数据库获取所有配置
 */
async function getAllConfigsFromDatabase(): Promise<
  Record<string, ConfigItem>
> {
  try {
    const { default: prisma } = await import("./prisma");
    const configs = await prisma.config.findMany({
      orderBy: { key: "asc" },
    });

    const result: Record<string, ConfigItem> = {};

    configs.forEach(
      (config: {
        key: string;
        value: unknown;
        description: string | null;
        updatedAt: Date;
      }) => {
        result[config.key] = {
          key: config.key,
          value: config.value,
          description: config.description,
          updatedAt: config.updatedAt,
        };
      },
    );

    return result;
  } catch (error) {
    console.error("从数据库获取所有配置失败:", error);
    return {};
  }
}

/**
 * 从缓存文件获取所有配置
 */
function getAllConfigsFromCache(): Record<string, ConfigItem> {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) {
      console.warn("配置缓存文件不存在:", CACHE_FILE_PATH);
      return {};
    }

    const cacheData = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const configs: Record<string, ConfigItem> = JSON.parse(cacheData);

    // 确保所有 updatedAt 都是 Date 对象
    const result: Record<string, ConfigItem> = {};

    Object.entries(configs).forEach(([key, config]) => {
      result[key] = {
        ...config,
        updatedAt: new Date(config.updatedAt),
      };
    });

    return result;
  } catch (error) {
    console.error("从缓存文件读取所有配置失败:", error);
    return {};
  }
}
