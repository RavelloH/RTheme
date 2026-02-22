import { hkdfSync, timingSafeEqual } from "node:crypto";

const DERIVE_SALT = Buffer.from("neutralpress", "utf8");
const DERIVE_INFO = Buffer.from("cache-bootstrap-v1", "utf8");
const DERIVE_LENGTH = 32;
const MIN_MASTER_SECRET_LENGTH = 32;

export function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("Bearer ")) return null;

  const token = value.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function deriveCacheBootstrapToken(masterSecret: string): string {
  const trimmed = masterSecret.trim();
  if (trimmed.length < MIN_MASTER_SECRET_LENGTH) {
    throw new Error("MASTER_SECRET 长度不足，无法派生 cache bootstrap token");
  }

  const derived = hkdfSync(
    "sha256",
    Buffer.from(trimmed, "utf8"),
    DERIVE_SALT,
    DERIVE_INFO,
    DERIVE_LENGTH,
  );
  return Buffer.from(derived).toString("base64url");
}

export function isSecureTokenEqual(
  incomingToken: string,
  expectedToken: string,
): boolean {
  const incomingBuffer = Buffer.from(incomingToken, "utf8");
  const expectedBuffer = Buffer.from(expectedToken, "utf8");

  if (incomingBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(incomingBuffer, expectedBuffer);
}
