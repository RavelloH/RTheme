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

export function jwtTokenVerify(tokenText: string): Record<string, unknown> | null {
  const verifyOptions: VerifyOptions = {
    algorithms: ["ES256"],
  };
  
  try {
    const decoded = jwt.verify(tokenText, publicKey, verifyOptions);
    
    // 如果是字符串类型，尝试解析为JSON对象
    if (typeof decoded === 'string') {
      try {
        return JSON.parse(decoded);
      } catch {
        return null;
      }
    }
    
    // 确保返回的是对象而不是其他类型
    if (typeof decoded === 'object' && decoded !== null) {
      return decoded as Record<string, unknown>;
    }
    
    return null;
  } catch (error) {
    console.error("JWT verification error:", error);
    return null;
  }
}
