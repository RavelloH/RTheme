import "server-only";

import { getConfig } from "./config-cache";

/**
 * Ably 配置工具
 *
 * 提供 Ably WebSocket 服务的配置检测和管理
 */

/**
 * 检查 Ably 是否已启用
 *
 * @returns 如果配置 notice.ably.key 有值则返回 true
 */
export const isAblyEnabled = async (): Promise<boolean> => {
  const apiKey = await getConfig("notice.ably.key");
  console.log("查询了ably");
  return Boolean(apiKey);
};

/**
 * 获取 Ably API Key
 *
 * @returns Ably API Key 字符串，如果未配置则返回 undefined
 */
export const getAblyApiKey = async (): Promise<string | undefined> => {
  const apiKey = await getConfig("notice.ably.key");
  return apiKey || undefined;
};

/**
 * 获取 Ably 配置对象
 *
 * @returns Ably 配置对象
 */
export const getAblyConfig = async () => {
  const apiKey = await getAblyApiKey();
  const isEnabled = await isAblyEnabled();

  return {
    /**
     * Ably API Key（格式：appId.keyId:keySecret）
     */
    apiKey,

    /**
     * 是否启用 Ably WebSocket 功能
     */
    isEnabled,

    /**
     * Token 有效期（毫秒），默认 1 小时
     */
    tokenTTL: parseInt("3600000", 10),

    /**
     * 是否启用轮询回退机制，默认启用
     */
    fallbackEnabled: true,
  } as const;
};
