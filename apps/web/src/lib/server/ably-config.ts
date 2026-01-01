import "server-only";

/**
 * Ably 配置工具
 *
 * 提供 Ably WebSocket 服务的配置检测和管理
 */

/**
 * 检查 Ably 是否已启用
 *
 * @returns 如果环境变量 ABLY_API_KEY 有值则返回 true
 */
export const isAblyEnabled = (): boolean => {
  return Boolean(process.env.ABLY_API_KEY);
};

/**
 * 获取 Ably API Key
 *
 * @returns Ably API Key 字符串，如果未配置则返回 undefined
 */
export const getAblyApiKey = (): string | undefined => {
  return process.env.ABLY_API_KEY;
};

/**
 * Ably 配置对象
 */
export const ablyConfig = {
  /**
   * Ably API Key（格式：appId.keyId:keySecret）
   */
  apiKey: getAblyApiKey(),

  /**
   * 是否启用 Ably WebSocket 功能
   */
  isEnabled: isAblyEnabled(),

  /**
   * Token 有效期（毫秒），默认 1 小时
   */
  tokenTTL: parseInt("3600000", 10),

  /**
   * 是否启用轮询回退机制，默认启用
   */
  fallbackEnabled: true,
} as const;
