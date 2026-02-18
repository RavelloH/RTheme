import { createHash, randomBytes } from "node:crypto";

export interface CloudRequestSignature {
  alg: "EdDSA";
  ts: string;
  nonce: string;
  sig: string;
  kid?: string;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((a, b) => a.localeCompare(b));
  const result: Record<string, unknown> = {};

  for (const key of keys) {
    result[key] = sortValue(record[key]);
  }

  return result;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function encodeBase64Url(input: Uint8Array | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
}

export function decodeBase64Url(input: string): Buffer {
  const normalized = input.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

export function sha256Base64Url(text: string): string {
  const digest = createHash("sha256").update(text).digest();
  return encodeBase64Url(digest);
}

export function generateNonce(size = 16): string {
  return encodeBase64Url(randomBytes(size));
}

export function buildCloudSignMessage(input: {
  method: string;
  path: string;
  payload: Record<string, unknown>;
  ts: string;
  nonce: string;
}): string {
  const bodyHash = sha256Base64Url(canonicalStringify(input.payload));
  return [
    "NP-CLOUD-SIGN-V1",
    input.method.toUpperCase(),
    input.path,
    bodyHash,
    input.ts,
    input.nonce,
  ].join("\n");
}

export function extractDnsTxtPublicKey(input: string): string {
  if (!input.includes(";") || !input.includes("=")) {
    return input.trim();
  }

  const segments = input.split(";");
  for (const segment of segments) {
    const [rawKey, ...rawValue] = segment.split("=");
    const key = rawKey?.trim().toLowerCase();
    if (key !== "p") continue;
    const value = rawValue.join("=").trim();
    if (value.length > 0) return value;
  }

  return input.trim();
}
