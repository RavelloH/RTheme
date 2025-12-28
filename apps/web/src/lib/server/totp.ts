import "server-only";

import crypto from "crypto";

// ============================================================================
// Base32 编解码
// ============================================================================

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * Base32 编码
 */
function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]!;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 解码
 */
function base32Decode(str: string): Buffer {
  const cleanStr = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleanStr.length; i++) {
    const char = cleanStr[i]!;
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

// ============================================================================
// TOTP 生成与验证
// ============================================================================

/**
 * 生成随机的 TOTP secret（Base32 编码）
 * @param length secret 长度（字节），默认 20
 * @returns Base32 编码的 secret
 */
export function generateTotpSecret(length: number = 20): string {
  const buffer = crypto.randomBytes(length);
  return base32Encode(buffer);
}

/**
 * 生成 TOTP URI（用于 QR 码）
 * @param secret Base32 编码的 secret
 * @param accountName 账户名称（通常是用户名或邮箱）
 * @param issuer 发行者名称（站点名称）
 * @returns TOTP URI
 */
export function generateTotpUri(
  secret: string,
  accountName: string,
  issuer: string,
): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?${params.toString()}`;
}

/**
 * 生成 TOTP 码
 * @param secret Base32 编码的 secret
 * @param timeStep 时间步长（秒），默认 30
 * @param time 当前时间戳（秒），默认为当前时间
 * @returns 6位数字验证码
 */
export function generateTotpCode(
  secret: string,
  timeStep: number = 30,
  time?: number,
): string {
  const counter = Math.floor((time || Date.now() / 1000) / timeStep);
  const secretBuffer = base32Decode(secret);

  // 生成 8 字节的计数器（大端序）
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  // HMAC-SHA1
  const hmac = crypto.createHmac("sha1", secretBuffer);
  hmac.update(counterBuffer);
  const digest = hmac.digest();

  // 动态截断
  const offset = digest[digest.length - 1]! & 0x0f;
  const code =
    ((digest[offset]! & 0x7f) << 24) |
    (digest[offset + 1]! << 16) |
    (digest[offset + 2]! << 8) |
    digest[offset + 3]!;

  // 返回 6 位数字
  return (code % 1000000).toString().padStart(6, "0");
}

/**
 * 验证 TOTP 码
 * @param secret Base32 编码的 secret
 * @param code 用户输入的 6 位验证码
 * @param window 时间窗口（允许前后 n 个时间步），默认 1（允许 ±30 秒）
 * @param timeStep 时间步长（秒），默认 30
 * @returns 是否验证通过
 */
export function verifyTotpCode(
  secret: string,
  code: string,
  window: number = 1,
  timeStep: number = 30,
): boolean {
  const currentTime = Math.floor(Date.now() / 1000);

  // 检查当前时间及前后时间窗口
  for (let i = -window; i <= window; i++) {
    const time = currentTime + i * timeStep;
    const expectedCode = generateTotpCode(secret, timeStep, time);

    if (code === expectedCode) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// 备份码生成
// ============================================================================

/**
 * 生成备份码（8位数字，格式 XXXX-XXXX）
 * @param count 生成数量，默认 8
 * @returns 备份码数组
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // 生成 8 位数字
    const num = crypto.randomInt(10000000, 99999999);
    const numStr = num.toString();
    // 格式化为 XXXX-XXXX
    const formatted = `${numStr.slice(0, 4)}-${numStr.slice(4)}`;
    codes.push(formatted);
  }

  return codes;
}

/**
 * 验证备份码格式
 * @param code 备份码
 * @returns 是否为有效格式
 */
export function isValidBackupCodeFormat(code: string): boolean {
  return /^\d{4}-\d{4}$/.test(code);
}
