import "server-only";

import type { KeyObject } from "crypto";
import { createPrivateKey, createPublicKey } from "crypto";
import type { SignOptions, VerifyOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

interface TokenSignOptions {
  inner: Record<string, unknown>;
  expired?: number | string;
}

export type AccessTokenPayload = {
  uid: number;
  username: string;
  nickname: string;
  role: string;
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = {
  uid: number;
  tokenId: string;
  iat: number;
  exp: number;
};

export type TotpTokenPayload = {
  uid: number;
  type: "totp_verification";
  iat: number;
  exp: number;
};

let cachedPrivateKey: KeyObject | null = null;
let cachedPublicKey: KeyObject | null = null;

function getPrivateKey(): KeyObject {
  if (cachedPrivateKey) {
    return cachedPrivateKey;
  }

  const key = process.env.JWT_PRIVATE_KEY;
  if (!key) {
    throw new Error("JWT_PRIVATE_KEY environment variable is not set");
  }

  cachedPrivateKey = createPrivateKey({
    key,
    format: "pem",
  });
  return cachedPrivateKey;
}

function getPublicKey(): KeyObject {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  const key = process.env.JWT_PUBLIC_KEY;
  if (!key) {
    throw new Error("JWT_PUBLIC_KEY environment variable is not set");
  }

  cachedPublicKey = createPublicKey({
    key,
    format: "pem",
  });
  return cachedPublicKey;
}

export function jwtTokenSign({ inner, expired = "7d" }: TokenSignOptions) {
  const signOptions: SignOptions = {
    algorithm: "ES256",
    header: {
      typ: "JWT",
      alg: "ES256",
    } as SignOptions["header"],
  };

  if (!("exp" in inner)) {
    signOptions.expiresIn = expired as SignOptions["expiresIn"];
  }

  return jwt.sign(inner, getPrivateKey(), signOptions);
}

export function jwtTokenVerify<T = AccessTokenPayload>(
  tokenText: string,
): T | null {
  if (!tokenText) {
    return null;
  }

  const verifyOptions: VerifyOptions = {
    algorithms: ["ES256"],
  };

  try {
    const decoded = jwt.verify(tokenText, getPublicKey(), verifyOptions);

    // 如果是字符串类型，尝试解析为JSON对象
    if (typeof decoded === "string") {
      try {
        return JSON.parse(decoded) as T;
      } catch {
        return null;
      }
    }

    // 确保返回的是对象而不是其他类型
    if (typeof decoded === "object" && decoded !== null) {
      return decoded as T;
    }

    return null;
  } catch (error) {
    console.error(
      "JWT verification error:",
      error instanceof Error ? error.message : "unknown error",
    );
    return null;
  }
}
