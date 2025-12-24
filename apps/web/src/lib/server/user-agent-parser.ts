import "server-only";
import { UAParser } from "ua-parser-js";

export interface ParsedUserAgent {
  deviceType: string; // 设备类型（Windows、macOS、iOS、Android、Linux 等）
  osVersion: string; // 操作系统版本
  browserName: string; // 浏览器名称
  browserVersion: string; // 浏览器版本
  displayName: string; // 显示名称，如 "Windows Edge 141"
  deviceIcon: string; // Remix Icon 名称
}

/**
 * 解析 User Agent 字符串
 * @param userAgent User Agent 字符串
 * @returns 解析后的设备和浏览器信息
 */
export function parseUserAgent(userAgent: string | null): ParsedUserAgent {
  if (!userAgent) {
    return {
      deviceType: "Unknown",
      osVersion: "Unknown",
      browserName: "Unknown",
      browserVersion: "",
      displayName: "未知设备",
      deviceIcon: "RiComputerLine",
    };
  }

  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // 解析操作系统
  const osName = result.os.name || "Unknown";
  const osVersion = result.os.version || "Unknown";

  // 解析浏览器
  const browserName = result.browser.name || "Unknown";
  const browserVersion = result.browser.version || "";

  // 确定设备类型
  let deviceType = osName;
  if (osName.includes("Windows")) {
    deviceType = "Windows";
  } else if (osName.includes("Mac OS")) {
    deviceType = "macOS";
  } else if (osName.includes("iOS")) {
    deviceType = "iOS";
  } else if (osName.includes("Android")) {
    deviceType = "Android";
  } else if (osName.includes("Linux")) {
    deviceType = "Linux";
  }

  // 确定设备图标
  let deviceIcon = "RiComputerLine";
  switch (deviceType) {
    case "Windows":
      deviceIcon = "RiWindowsFill";
      break;
    case "macOS":
      deviceIcon = "RiAppleFill";
      break;
    case "iOS":
      deviceIcon = "RiAppleFill";
      break;
    case "Android":
      deviceIcon = "RiAndroidFill";
      break;
    case "Linux":
      deviceIcon = "RiTerminalBoxFill";
      break;
  }

  // 构建显示名称
  let displayName = "";
  if (deviceType === "iOS" || deviceType === "Android") {
    // 移动设备：iOS Safari 17.2 或 Android Chrome 120
    displayName = `${deviceType} ${browserName} ${browserVersion.split(".")[0] || ""}`;
  } else {
    // 桌面设备：Windows Edge 141 或 macOS Safari 17
    displayName = `${deviceType} ${browserName} ${browserVersion.split(".")[0] || ""}`;
  }

  // 如果版本号为空，移除末尾的空格
  displayName = displayName.trim();

  return {
    deviceType,
    osVersion,
    browserName,
    browserVersion,
    displayName,
    deviceIcon,
  };
}

/**
 * 格式化 IP 位置信息
 * @param location IP 位置对象（来自 resolveIpLocation）
 * @returns 格式化后的位置字符串
 */
export function formatIpLocation(
  location: {
    country: string | null;
    region: string | null;
    city: string | null;
  } | null,
): string | null {
  if (!location) return null;

  const parts = [];
  if (location.country) parts.push(location.country);
  if (location.region) parts.push(location.region);
  if (location.city) parts.push(location.city);

  return parts.length > 0 ? parts.join(" ") : null;
}
