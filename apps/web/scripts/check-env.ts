// script/check-env.ts
// 检查环境变量设置是否正确

import { randomBytes } from "crypto";
import Rlog from "rlog-js";
import { pathToFileURL } from "url";

import { loadWebEnv } from "@/../scripts/load-env";

// 加载 apps/web 与仓库根目录下的 .env* 文件
loadWebEnv();

const rlog = new Rlog();

// 计算香农熵
function calculateShannonEntropy(str: string): number {
  const len = str.length;
  const frequencies = new Map<string, number>();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }
  let entropy = 0;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

const PEM_PREFIX = "-----";
const BASE64_KEY_PATTERN = /^[A-Za-z0-9+/=_-]+$/;

function normalizeJwtKeyFromEnv(value: string): string {
  const unescaped = value.replace(/\\n/g, "\n").trim();
  if (!unescaped) {
    return "";
  }

  if (unescaped.startsWith(PEM_PREFIX)) {
    return unescaped;
  }

  const compact = unescaped.replace(/\s+/g, "");
  if (!BASE64_KEY_PATTERN.test(compact)) {
    return unescaped;
  }

  const normalizedBase64 = compact.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalizedBase64.padEnd(
    normalizedBase64.length + ((4 - (normalizedBase64.length % 4)) % 4),
    "=",
  );

  try {
    const decoded = Buffer.from(padded, "base64").toString("utf8").trim();
    if (decoded.startsWith(PEM_PREFIX)) {
      return decoded;
    }
  } catch {
    // ignore invalid base64
  }

  return unescaped;
}

function validatePemKey(
  value: string,
  type: "private" | "public",
): string | null {
  const normalized = normalizeJwtKeyFromEnv(value);
  const begin = type === "private" ? "BEGIN PRIVATE KEY" : "BEGIN PUBLIC KEY";
  const end = type === "private" ? "END PRIVATE KEY" : "END PUBLIC KEY";

  if (!normalized.includes(begin) || !normalized.includes(end)) {
    return `Should be a valid PEM format ${type} key, or base64-encoded PEM ${type} key`;
  }

  return null;
}

// 必需的环境变量配置
const REQUIRED_ENV_VARS = [
  {
    name: "DATABASE_URL",
    description: "Database connection string",
    validator: (value: string) => {
      if (
        !value.startsWith("postgresql://") &&
        !value.startsWith("postgres://")
      ) {
        return "Must be a PostgreSQL connection string (postgresql:// or postgres://)";
      }
      return null;
    },
  },
  {
    name: "REDIS_URL",
    description: "Redis connection string (required)",
    validator: (value: string) => {
      if (!value.startsWith("redis://") && !value.startsWith("rediss://")) {
        return "Should be a valid Redis connection string (redis:// or rediss://)";
      }
      return null;
    },
  },
  {
    name: "MASTER_SECRET",
    description: "Master secret key for deriving encryption keys",
    validator: (value: string) => {
      if (value.length < 32) {
        return "Should be at least 32 characters long for security";
      }
      const entropy = calculateShannonEntropy(value);
      // 防止过于简单的密钥
      if (entropy < 3.5) {
        return `Entropy is too low (${entropy.toFixed(2)}). Please use a more random secret (aim for > 3.5).`;
      }
      return null;
    },
  },
  {
    name: "JWT_PRIVATE_KEY",
    description: "JWT private key for token signing",
    validator: (value: string) => validatePemKey(value, "private"),
  },
  {
    name: "JWT_PUBLIC_KEY",
    description: "JWT public key for token verification",
    validator: (value: string) => validatePemKey(value, "public"),
  },
];

// 可选的环境变量配置
const OPTIONAL_ENV_VARS = [
  {
    name: "ENABLE_API",
    description: "Enable API endpoints (optional, default: true)",
    validator: (value: string) => {
      if (value && !["true", "false", "1", "0"].includes(value.toLowerCase())) {
        return "Should be 'true', 'false', '1', or '0' if provided";
      }
      return null;
    },
  },
  {
    name: "DISABLE_ANALYTICS",
    description: "Disable analytics tracking (optional, default: false)",
    validator: (value: string) => {
      if (value && !["true", "false", "1", "0"].includes(value.toLowerCase())) {
        return "Should be 'true', 'false', '1', or '0' if provided";
      }
      return null;
    },
  },
];

// 导出的环境检查函数
export async function checkEnvironmentVariables(): Promise<void> {
  let hasErrors = false;
  let hasWarnings = false;

  // 检查必需的环境变量
  rlog.info("> Checking required environment variables:");
  // 先获取最长的环境变量字符
  let maxLength = 0;
  for (const envVar of REQUIRED_ENV_VARS)
    if (envVar.name.length > maxLength) {
      maxLength = envVar.name.length;
    }
  // 输出检查
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      rlog.error(
        `  ✗ ${envVar.name}${" ".repeat(maxLength - envVar.name.length)} is missing`,
      );
      if (envVar.name === "MASTER_SECRET") {
        const generated = randomBytes(32).toString("hex");
        rlog.info(`    Auto-generated strong secret: ${generated}`);
        rlog.info(`    Please add this MASTER_SECRET to your .env file.`);
      }
      rlog.error(`    Description: ${envVar.description}`);
      hasErrors = true;
    } else {
      const validationError = envVar.validator(value);
      if (validationError) {
        rlog.error(
          `  ✗ ${envVar.name}${" ".repeat(maxLength - envVar.name.length)} is invalid: ${validationError}`,
        );
        if (envVar.name === "MASTER_SECRET") {
          const generated = randomBytes(32).toString("hex");
          rlog.info(`    Recommended strong secret: ${generated}`);
        }
        hasErrors = true;
      } else {
        rlog.success(
          `  ✓ ${envVar.name}${" ".repeat(maxLength - envVar.name.length)} is set and valid`,
        );
      }
    }
  }

  // 检查可选的环境变量
  rlog.info("> Checking optional environment variables:");
  maxLength = 0;
  for (const envVar of OPTIONAL_ENV_VARS)
    if (envVar.name.length > maxLength) {
      maxLength = envVar.name.length;
    }
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar.name];

    if (!value) {
      rlog.info(
        `  ○ ${envVar.name}${" ".repeat(maxLength - envVar.name.length)} is not set (optional)`,
      );
    } else {
      const validationError = envVar.validator(value);
      if (validationError) {
        rlog.warning(
          `  ! ${envVar.name}${" ".repeat(maxLength - envVar.name.length)} is set but invalid: ${validationError}`,
        );
        hasWarnings = true;
      } else {
        rlog.success(
          `  ✓ ${envVar.name}${" ".repeat(maxLength - envVar.name.length)} is set and valid`,
        );
      }
    }
  }

  // 总结检查结果
  if (hasErrors) {
    rlog.error("✗ Environment variables check failed!");
    rlog.error(
      "  Please check your .env file and set the missing or invalid variables.",
    );
    rlog.error("  Example .env file:");
    rlog.error("  DATABASE_URL=postgresql://user:password@host:port/database");
    rlog.error("  REDIS_URL=redis://localhost:6379");
    rlog.error("  MASTER_SECRET=your_secure_master_secret_at_least_32_chars");
    rlog.error(
      '  JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"',
    );
    rlog.error(
      '  JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"',
    );
    rlog.error(
      "  # Or base64-encoded PEM keys (single line, no newline/tab required):",
    );
    rlog.error("  JWT_PRIVATE_KEY=<base64_of_pem_private_key>");
    rlog.error("  JWT_PUBLIC_KEY=<base64_of_pem_public_key>");
    rlog.error("  # Optional variables:");
    rlog.error("  ENABLE_API=true");
    rlog.error("  DISABLE_ANALYTICS=false");
    throw new Error("Required environment variables are missing or invalid");
  }

  if (hasWarnings) {
    rlog.warning("  Environment variables check completed with warnings");
    rlog.warning(
      "  Optional variables have issues but the system can still function",
    );
  } else {
    rlog.success("✓ Environment variables check completed");
  }
}

// 主入口函数
async function main() {
  try {
    await checkEnvironmentVariables();
  } catch (error) {
    rlog.error(
      `Environment check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
}

// 检查是否是直接运行
function isMainModule(): boolean {
  try {
    // 检查当前文件是否是主模块
    const arg1 = process.argv[1];
    return (
      import.meta.url === pathToFileURL(arg1 || "").href ||
      (arg1?.endsWith("check-env.ts") ?? false) ||
      (arg1?.endsWith("check-env.js") ?? false)
    );
  } catch {
    return false;
  }
}

// 如果直接运行此脚本
if (isMainModule()) {
  main();
}
