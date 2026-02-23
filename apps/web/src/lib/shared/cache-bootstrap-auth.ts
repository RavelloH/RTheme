import { hkdfSync, timingSafeEqual } from "node:crypto";

const DERIVE_SALT = Buffer.from("neutralpress", "utf8");
const DERIVE_LENGTH = 32;
const MIN_MASTER_SECRET_LENGTH = 32;

export const INTERNAL_TOKEN_PURPOSES = {
  CACHE_BOOTSTRAP: "cache-bootstrap-v1",
  WATCHTOWER_API: "watchtower-api-v1",
} as const;

export type InternalTokenPurpose =
  (typeof INTERNAL_TOKEN_PURPOSES)[keyof typeof INTERNAL_TOKEN_PURPOSES];

export function parseBearerToken(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("Bearer ")) return null;

  const token = value.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function deriveInternalToken(
  masterSecret: string,
  purpose: InternalTokenPurpose,
): string {
  const trimmed = masterSecret.trim();
  if (trimmed.length < MIN_MASTER_SECRET_LENGTH) {
    throw new Error("MASTER_SECRET 长度不足，无法派生内部 token");
  }

  const derived = hkdfSync(
    "sha256",
    Buffer.from(trimmed, "utf8"),
    DERIVE_SALT,
    Buffer.from(purpose, "utf8"),
    DERIVE_LENGTH,
  );
  return Buffer.from(derived).toString("base64url");
}

export function deriveCacheBootstrapToken(masterSecret: string): string {
  return deriveInternalToken(
    masterSecret,
    INTERNAL_TOKEN_PURPOSES.CACHE_BOOTSTRAP,
  );
}

export function deriveWatchtowerApiToken(masterSecret: string): string {
  return deriveInternalToken(
    masterSecret,
    INTERNAL_TOKEN_PURPOSES.WATCHTOWER_API,
  );
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
