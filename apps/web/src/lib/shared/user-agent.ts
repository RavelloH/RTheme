/**
 * 共享的 User Agent 解析工具
 *
 * 可在客户端和服务端使用的轻量级 UA 解析函数
 */

/**
 * 获取浏览器名称
 *
 * @param ua - User Agent 字符串
 * @returns 浏览器名称
 */
export function getBrowserName(ua: string): string {
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown";
}

/**
 * 获取操作系统名称
 *
 * @param ua - User Agent 字符串
 * @returns 操作系统名称
 */
export function getOSName(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad"))
    return "iOS";
  return "Unknown";
}

/**
 * 解析 User Agent 字符串
 *
 * @param ua - User Agent 字符串
 * @returns 包含浏览器和操作系统信息的对象
 */
export function parseUserAgent(ua: string): {
  browser: string;
  os: string;
} {
  return {
    browser: getBrowserName(ua),
    os: getOSName(ua),
  };
}
