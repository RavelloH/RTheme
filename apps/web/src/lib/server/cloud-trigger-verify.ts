import "server-only";

import {
  createPublicKey,
  type KeyObject,
  verify as verifySignature,
} from "node:crypto";

import {
  decodeBase64Url,
  extractDnsTxtPublicKey,
} from "@/lib/shared/cloud-signature";

type VerifySource = "DOH" | "JWKS" | "NONE";

type CloudJwtHeader = {
  alg?: string;
  kid?: string;
  typ?: string;
};

type CloudJwtClaims = {
  iss?: string;
  aud?: string | string[];
  sub?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  siteId?: string;
  deliveryId?: string;
  [key: string]: unknown;
};

type TokenVerificationResult = {
  ok: boolean;
  source: VerifySource;
  dnssecAd: boolean | null;
  verifyMs: number;
  tokenAgeMs: number | null;
  message: string | null;
  claims: CloudJwtClaims | null;
};

type ParsedJwt = {
  header: CloudJwtHeader;
  claims: CloudJwtClaims;
  signingInput: string;
  signature: Buffer;
};

type DnsTxtAnswer = {
  data?: string;
  type?: number;
};

type DnsJsonResponse = {
  Status?: number;
  AD?: boolean;
  Answer?: DnsTxtAnswer[];
};

type JwkWithKid = JsonWebKey & {
  kid?: string;
  kty?: string;
  crv?: string;
  x?: string;
};

type JwksResponse = {
  keys?: JwkWithKid[];
};

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");
const CLOCK_SKEW_SECONDS = 10;

function parseJwt(token: string): ParsedJwt | null {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signatureSegment] = segments;
  if (!headerSegment || !payloadSegment || !signatureSegment) {
    return null;
  }

  try {
    const header = JSON.parse(
      decodeBase64Url(headerSegment).toString("utf8"),
    ) as CloudJwtHeader;
    const claims = JSON.parse(
      decodeBase64Url(payloadSegment).toString("utf8"),
    ) as CloudJwtClaims;
    return {
      header,
      claims,
      signingInput: `${headerSegment}.${payloadSegment}`,
      signature: decodeBase64Url(signatureSegment),
    };
  } catch {
    return null;
  }
}

function parseTxtRecord(raw: string): string {
  const matches = [...raw.matchAll(/"([^"]*)"/g)];
  if (matches.length === 0) {
    return raw.trim();
  }
  return matches
    .map((match) => match[1] ?? "")
    .join("")
    .trim();
}

function decodeBase64Flexible(value: string): Buffer | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return decodeBase64Url(trimmed);
  } catch {
    // ignore
  }

  try {
    return Buffer.from(trimmed, "base64");
  } catch {
    return null;
  }
}

function importEd25519PublicKey(raw: string): KeyObject | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes("BEGIN PUBLIC KEY")) {
      return createPublicKey(trimmed);
    }

    const keyMaterial = extractDnsTxtPublicKey(trimmed);
    const decoded = decodeBase64Flexible(keyMaterial);
    if (!decoded) return null;

    if (decoded.length === 32) {
      return createPublicKey({
        key: Buffer.concat([ED25519_SPKI_PREFIX, decoded]),
        format: "der",
        type: "spki",
      });
    }

    return createPublicKey({
      key: decoded,
      format: "der",
      type: "spki",
    });
  } catch {
    return null;
  }
}

function verifyTokenWithKey(parsed: ParsedJwt, key: KeyObject): boolean {
  try {
    return verifySignature(
      null,
      Buffer.from(parsed.signingInput, "utf8"),
      key,
      parsed.signature,
    );
  } catch {
    return false;
  }
}

function isAudienceMatch(
  actual: string | string[] | undefined,
  expected: string,
): boolean {
  if (!actual) return false;
  if (typeof actual === "string") return actual === expected;
  return actual.includes(expected);
}

function validateClaims(input: {
  claims: CloudJwtClaims;
  expectedSiteId: string;
  expectedDeliveryId: string;
  issuer: string;
  audience: string;
}): { ok: boolean; message: string | null; tokenAgeMs: number | null } {
  const nowSec = Math.floor(Date.now() / 1000);
  const { claims } = input;

  if (claims.iss !== input.issuer) {
    return { ok: false, message: "issuer 不匹配", tokenAgeMs: null };
  }

  if (!isAudienceMatch(claims.aud, input.audience)) {
    return { ok: false, message: "audience 不匹配", tokenAgeMs: null };
  }

  if (claims.siteId !== input.expectedSiteId) {
    return { ok: false, message: "siteId 不匹配", tokenAgeMs: null };
  }

  if (claims.deliveryId !== input.expectedDeliveryId) {
    return { ok: false, message: "deliveryId 不匹配", tokenAgeMs: null };
  }

  if (claims.sub && claims.sub !== input.expectedSiteId) {
    return { ok: false, message: "subject 不匹配", tokenAgeMs: null };
  }

  if (
    typeof claims.exp !== "number" ||
    nowSec > claims.exp + CLOCK_SKEW_SECONDS
  ) {
    return { ok: false, message: "token 已过期", tokenAgeMs: null };
  }

  if (
    typeof claims.nbf === "number" &&
    nowSec + CLOCK_SKEW_SECONDS < claims.nbf
  ) {
    return { ok: false, message: "token 尚未生效", tokenAgeMs: null };
  }

  if (
    typeof claims.iat === "number" &&
    nowSec + CLOCK_SKEW_SECONDS < claims.iat
  ) {
    return { ok: false, message: "token iat 非法", tokenAgeMs: null };
  }

  const tokenAgeMs =
    typeof claims.iat === "number"
      ? Math.max(0, Date.now() - claims.iat * 1000)
      : null;

  return { ok: true, message: null, tokenAgeMs };
}

async function fetchJsonWithTimeout<T>(
  url: string,
  timeoutMs: number,
): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/dns-json, application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveDohPublicKeys(domain: string): Promise<{
  keys: KeyObject[];
  dnssecAd: boolean | null;
}> {
  const endpoints = [
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=TXT&do=true&cd=false`,
    `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=TXT&do=true&cd=false`,
  ];

  let dnssecAd: boolean | null = null;
  for (const endpoint of endpoints) {
    const response = await fetchJsonWithTimeout<DnsJsonResponse>(
      endpoint,
      5000,
    );
    if (!response) continue;

    dnssecAd = typeof response.AD === "boolean" ? response.AD : dnssecAd;
    if (response.AD !== true) {
      continue;
    }

    const answers = Array.isArray(response.Answer) ? response.Answer : [];
    const txtRecords = answers
      .filter(
        (answer) => answer?.type === 16 && typeof answer.data === "string",
      )
      .map((answer) => parseTxtRecord(answer.data as string))
      .filter((item) => item.length > 0);

    const keys = txtRecords
      .map((item) => importEd25519PublicKey(item))
      .filter((item): item is KeyObject => Boolean(item));

    if (keys.length > 0) {
      return { keys, dnssecAd: true };
    }
  }

  return { keys: [], dnssecAd };
}

async function resolveJwksPublicKeys(
  jwksUrl: string,
  kid?: string,
): Promise<KeyObject[]> {
  const jwks = await fetchJsonWithTimeout<JwksResponse>(jwksUrl, 5000);
  if (!jwks || !Array.isArray(jwks.keys)) {
    return [];
  }

  const candidates = jwks.keys.filter((item) => {
    if (!item || item.kty !== "OKP" || item.crv !== "Ed25519") {
      return false;
    }
    if (kid && item.kid && item.kid !== kid) {
      return false;
    }
    return typeof item.x === "string" && item.x.length > 0;
  });

  const ordered = kid
    ? [...candidates, ...jwks.keys.filter((item) => item.kid !== kid)]
    : candidates;

  const result: KeyObject[] = [];
  for (const jwk of ordered) {
    try {
      result.push(
        createPublicKey({
          key: jwk as JsonWebKey,
          format: "jwk",
        }),
      );
    } catch {
      // ignore invalid jwk item
    }
  }

  return result;
}

export async function verifyCloudTriggerToken(input: {
  token: string;
  expectedSiteId: string;
  expectedDeliveryId: string;
  issuer: string;
  audience: string;
  dohDomain: string;
  jwksUrl: string;
}): Promise<TokenVerificationResult> {
  const startedAtMs = Date.now();
  const parsed = parseJwt(input.token);
  if (!parsed) {
    return {
      ok: false,
      source: "NONE",
      dnssecAd: null,
      verifyMs: Date.now() - startedAtMs,
      tokenAgeMs: null,
      message: "token 格式错误",
      claims: null,
    };
  }

  if (parsed.header.alg !== "EdDSA") {
    return {
      ok: false,
      source: "NONE",
      dnssecAd: null,
      verifyMs: Date.now() - startedAtMs,
      tokenAgeMs: null,
      message: "token 算法不支持",
      claims: parsed.claims,
    };
  }

  const dohResult = await resolveDohPublicKeys(input.dohDomain);
  for (const key of dohResult.keys) {
    if (!verifyTokenWithKey(parsed, key)) continue;
    const validated = validateClaims({
      claims: parsed.claims,
      expectedSiteId: input.expectedSiteId,
      expectedDeliveryId: input.expectedDeliveryId,
      issuer: input.issuer,
      audience: input.audience,
    });
    if (validated.ok) {
      return {
        ok: true,
        source: "DOH",
        dnssecAd: dohResult.dnssecAd,
        verifyMs: Date.now() - startedAtMs,
        tokenAgeMs: validated.tokenAgeMs,
        message: null,
        claims: parsed.claims,
      };
    }
  }

  const jwksKeys = await resolveJwksPublicKeys(
    input.jwksUrl,
    parsed.header.kid,
  );
  for (const key of jwksKeys) {
    if (!verifyTokenWithKey(parsed, key)) continue;
    const validated = validateClaims({
      claims: parsed.claims,
      expectedSiteId: input.expectedSiteId,
      expectedDeliveryId: input.expectedDeliveryId,
      issuer: input.issuer,
      audience: input.audience,
    });
    if (validated.ok) {
      return {
        ok: true,
        source: "JWKS",
        dnssecAd: dohResult.dnssecAd,
        verifyMs: Date.now() - startedAtMs,
        tokenAgeMs: validated.tokenAgeMs,
        message: null,
        claims: parsed.claims,
      };
    }
  }

  const fallbackValidation = validateClaims({
    claims: parsed.claims,
    expectedSiteId: input.expectedSiteId,
    expectedDeliveryId: input.expectedDeliveryId,
    issuer: input.issuer,
    audience: input.audience,
  });

  return {
    ok: false,
    source: "NONE",
    dnssecAd: dohResult.dnssecAd,
    verifyMs: Date.now() - startedAtMs,
    tokenAgeMs: fallbackValidation.tokenAgeMs,
    message: fallbackValidation.ok
      ? "签名校验失败"
      : fallbackValidation.message,
    claims: parsed.claims,
  };
}

export type { TokenVerificationResult, VerifySource };
