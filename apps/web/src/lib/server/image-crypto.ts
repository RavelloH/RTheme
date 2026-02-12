import "server-only";

import crypto from "crypto";

// ============================================================================
// 常量定义
// ============================================================================

const BASE62_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const SIGNATURE_LENGTH = 4; // 签名长度（base62字符）
const SHORT_HASH_LENGTH = 8; // 短哈希长度

// ============================================================================
// 密钥派生
// ============================================================================

/**
 * 使用 HKDF 从主密钥派生子密钥
 */
function deriveKey(masterSecret: string, info: string, length: number): Buffer {
  const ikm = Buffer.from(masterSecret, "utf-8");
  const salt = Buffer.alloc(32); // 空盐
  const infoBuffer = Buffer.from(info, "utf-8");

  const derived = crypto.hkdfSync("sha256", ikm, salt, infoBuffer, length);
  return Buffer.from(derived);
}

/**
 * 获取签名密钥
 */
function getSigningKey(): Buffer {
  const masterSecret = process.env.MASTER_SECRET;
  if (!masterSecret) {
    throw new Error("MASTER_SECRET 环境变量未设置");
  }
  return deriveKey(masterSecret, "image-sign", 32);
}

// ============================================================================
// Base62 编解码
// ============================================================================

/**
 * Buffer 转 Base62 字符串
 */
function bufferToBase62(buffer: Buffer): string {
  let num = BigInt("0x" + buffer.toString("hex"));
  if (num === 0n) return "0";

  let result = "";
  const base = BigInt(62);

  while (num > 0n) {
    const remainder = Number(num % base);
    result = BASE62_CHARS[remainder] + result;
    num = num / base;
  }

  return result;
}

// ============================================================================
// 签名生成与验证
// ============================================================================

/**
 * 生成图片签名
 * @param shortHash 8位短哈希
 * @returns 4位 base62 签名
 */
export function generateSignature(shortHash: string): string {
  const key = getSigningKey();
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(shortHash);
  const digest = hmac.digest();

  // 转换为 base62 并截取前 SIGNATURE_LENGTH 位
  const base62 = bufferToBase62(digest);
  return base62.slice(0, SIGNATURE_LENGTH).padStart(SIGNATURE_LENGTH, "0");
}

/**
 * 验证图片签名
 * @param shortHash 8位短哈希
 * @param signature 4位签名
 * @returns 是否有效
 */
export function verifySignature(shortHash: string, signature: string): boolean {
  const expectedSignature = generateSignature(shortHash);
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature),
  );
}

/**
 * 生成完整的图片ID（shortHash + signature）
 * @param shortHash 8位短哈希
 * @returns 12位图片ID
 */
export function generateImageId(shortHash: string): string {
  // 确保 shortHash 是8个字符（兼容旧数据）
  const normalizedShortHash = shortHash.padStart(8, "0").slice(0, 8);
  const signature = generateSignature(normalizedShortHash);
  return normalizedShortHash + signature;
}

/**
 * 服务器端专用：为 shortHash 生成带签名的完整 imageId
 * 用于在服务器端渲染时生成正确的图片访问链接
 * @param shortHash - 8位短哈希
 * @returns 12位带签名的 imageId (8位shortHash + 4位签名)
 * @throws 仅在服务器端可用，客户端调用会抛出错误
 */
export function generateSignedImageId(shortHash: string): string {
  // 确保仅在服务器端运行
  if (typeof window !== "undefined") {
    throw new Error(
      "generateSignedImageId can only be used on the server side",
    );
  }

  return generateImageId(shortHash);
}

/**
 * 解析图片ID
 * @param imageId 12位图片ID
 * @returns { shortHash, signature } 或 null（格式无效）
 */
export function parseImageId(
  imageId: string,
): { shortHash: string; signature: string } | null {
  const expectedLength = SHORT_HASH_LENGTH + SIGNATURE_LENGTH;
  if (imageId.length !== expectedLength) {
    return null;
  }

  // 验证字符集
  for (const char of imageId) {
    if (!BASE62_CHARS.includes(char)) {
      return null;
    }
  }

  return {
    shortHash: imageId.slice(0, SHORT_HASH_LENGTH),
    signature: imageId.slice(SHORT_HASH_LENGTH),
  };
}

// ============================================================================
// 导出常量
// ============================================================================

export { SHORT_HASH_LENGTH, SIGNATURE_LENGTH };
