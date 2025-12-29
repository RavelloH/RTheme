import "server-only";
import { headers } from "next/headers";
/**
 * 获取客户端真实 IP 地址
 */
export async function getClientIP(): Promise<string> {
  const headersList = await headers();

  // 尝试从常见的代理头获取真实 IP
  const forwardedFor = headersList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }

  const realIP = headersList.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // 如果都没有，返回未知
  return "unknown";
}

/**
 * 获取客户端 User-Agent
 */
export async function getClientUserAgent(): Promise<string> {
  const headersList = await headers();
  return headersList.get("user-agent") || "unknown";
}
