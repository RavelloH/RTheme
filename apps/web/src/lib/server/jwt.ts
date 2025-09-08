import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken";
import { createPrivateKey, createPublicKey, KeyObject } from "crypto";

interface TokenSignOptions {
  inner: Record<string, unknown>;
  expired?: number | string;
}

// 检查环境变量
if (!process.env.JWT_PRIVATE_KEY) {
  throw new Error("JWT_PRIVATE_KEY environment variable is not set");
}

if (!process.env.JWT_PUBLIC_KEY) {
  throw new Error("JWT_PUBLIC_KEY environment variable is not set");
}

// 安全加载私钥
const privateKey: KeyObject = createPrivateKey({
  key: process.env.JWT_PRIVATE_KEY,
  format: "pem",
});

const publicKey: KeyObject = createPublicKey({
  key: process.env.JWT_PUBLIC_KEY,
  format: "pem",
});

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

  return jwt.sign(inner, privateKey, signOptions);
}

export function jwtTokenVerify(tokenText: string) {
  const verifyOptions: VerifyOptions = {
    algorithms: ["ES256"],
  };
  return jwt.verify(tokenText, publicKey, verifyOptions);
}
