import "server-only";

import crypto from "crypto";

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
 * 获取 TOTP 加密密钥
 */
function getTotpEncryptionKey(): Buffer {
  const masterSecret = process.env.MASTER_SECRET;
  if (!masterSecret) {
    throw new Error("MASTER_SECRET 环境变量未设置");
  }
  return deriveKey(masterSecret, "totp-encrypt", 32);
}

// ============================================================================
// TOTP Secret 加密与解密
// ============================================================================

/**
 * 加密 TOTP secret
 * @param secret 原始 TOTP secret（Base32 编码）
 * @returns base64 编码的加密数据（包含 IV）
 */
export function encryptTotpSecret(secret: string): string {
  const key = getTotpEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM 推荐 12 字节 IV

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // 格式: IV(12) + AuthTag(16) + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);

  // 转换为 base64
  return combined.toString("base64");
}

/**
 * 解密 TOTP secret
 * @param encryptedData base64 编码的加密数据
 * @returns 原始 TOTP secret 或 null（解密失败）
 */
export function decryptTotpSecret(encryptedData: string): string | null {
  try {
    const key = getTotpEncryptionKey();
    const combined = Buffer.from(encryptedData, "base64");

    // 解析: IV(12) + AuthTag(16) + Ciphertext
    if (combined.length < 28) {
      return null;
    }

    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  } catch {
    return null;
  }
}

// ============================================================================
// 备份码加密与解密
// ============================================================================

/**
 * 加密备份码
 * @param code 原始备份码（8位数字）
 * @returns base64 编码的加密数据
 */
export function encryptBackupCode(code: string): string {
  const key = getTotpEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(code, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64");
}

/**
 * 解密备份码
 * @param encryptedData base64 编码的加密数据
 * @returns 原始备份码 或 null（解密失败）
 */
export function decryptBackupCode(encryptedData: string): string | null {
  try {
    const key = getTotpEncryptionKey();
    const combined = Buffer.from(encryptedData, "base64");

    if (combined.length < 28) {
      return null;
    }

    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const encrypted = combined.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf-8");
  } catch {
    return null;
  }
}
