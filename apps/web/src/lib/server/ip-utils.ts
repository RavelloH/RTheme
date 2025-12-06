import "server-only";

let ipSearcher: {
  btreeSearchSync?: (ip: string) => { region?: string };
  binarySearchSync?: (ip: string) => { region?: string };
} | null = null;

/**
 * 检查 IP 是否为 IPv4 格式
 */
export function isIPv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    const num = Number(part);
    return Number.isInteger(num) && num >= 0 && num <= 255;
  });
}

/**
 * 检查 IP 是否为内网/本地 IP
 */
export function isPrivateIP(ip: string): boolean {
  // IPv6 本地地址
  if (ip === "::1" || ip === "::ffff:127.0.0.1") return true;

  // IPv4 本地/内网地址
  if (ip.startsWith("127.")) return true; // 回环地址
  if (ip.startsWith("10.")) return true; // A 类私有地址
  if (ip.startsWith("192.168.")) return true; // C 类私有地址
  if (ip.startsWith("172.")) {
    // B 类私有地址 172.16.0.0 - 172.31.255.255
    const second = parseInt(ip.split(".")[1] ?? "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (ip.startsWith("169.254.")) return true; // 链路本地地址

  return false;
}

/**
 * 获取 IP 搜索器实例
 */
function getIpSearcher() {
  if (ipSearcher) return ipSearcher;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IP2Region = require("node-ip2region");
    // 使用 path.join 在运行时构建数据库路径，避免 bundler 将 .db 文件作为模块处理
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
    const dbPath = path.join(
      process.cwd(),
      "node_modules/node-ip2region/data/ip2region.db",
    );
    ipSearcher = IP2Region.create(dbPath);
    return ipSearcher;
  } catch (error) {
    console.error("加载 ip2region 失败:", error);
    return null;
  }
}

/**
 * 解析 IP 地址的地理位置信息
 * @param ip IP 地址
 * @returns 包含 country, region, city 的对象，如果无法解析则返回 null
 */
export function resolveIpLocation(ip: string | null): {
  country: string | null;
  region: string | null;
  city: string | null;
} | null {
  if (!ip || ip === "unknown") return null;

  // 跳过内网/本地 IP
  if (isPrivateIP(ip)) return null;

  // ip2region 仅支持 IPv4
  if (!isIPv4(ip)) return null;

  try {
    const searcher = getIpSearcher();
    if (!searcher) return null;

    const regionResult =
      (searcher.btreeSearchSync?.(ip) as { region?: string } | undefined) ||
      (searcher.binarySearchSync?.(ip) as { region?: string } | undefined);

    const regionText = regionResult?.region;
    if (!regionText) return null;

    // ip2region 格式: 国家|区域|省份|城市|运营商
    const parts = regionText.split("|");

    // 提取各个部分，过滤掉 "0" 占位符
    const country = parts[0] && parts[0] !== "0" ? parts[0] : null;
    const region = parts[2] && parts[2] !== "0" ? parts[2] : null; // 省份/州
    const city = parts[3] && parts[3] !== "0" ? parts[3] : null;

    // 如果所有字段都是 null，返回 null
    if (!country && !region && !city) return null;

    return { country, region, city };
  } catch (error) {
    console.error("IP 归属地解析失败:", error);
    return null;
  }
}
