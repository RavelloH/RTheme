import "server-only";

import {
  deriveCacheBootstrapToken,
  isSecureTokenEqual,
  parseBearerToken,
} from "@/lib/shared/cache-bootstrap-auth";

export type InternalAuthFailureReason =
  | "MISSING_TOKEN"
  | "MASTER_SECRET_UNAVAILABLE"
  | "INVALID_TOKEN";

export type InternalAuthValidationResult =
  | { ok: true }
  | { ok: false; reason: InternalAuthFailureReason };

export function validateInternalBearerToken(
  authorizationHeader: string | null,
): InternalAuthValidationResult {
  const token = parseBearerToken(authorizationHeader);
  if (!token) {
    return { ok: false, reason: "MISSING_TOKEN" };
  }

  const masterSecret = process.env.MASTER_SECRET?.trim();
  if (!masterSecret) {
    return { ok: false, reason: "MASTER_SECRET_UNAVAILABLE" };
  }

  try {
    const expectedToken = deriveCacheBootstrapToken(masterSecret);
    const authorized = isSecureTokenEqual(token, expectedToken);
    if (!authorized) {
      return { ok: false, reason: "INVALID_TOKEN" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "MASTER_SECRET_UNAVAILABLE" };
  }
}
