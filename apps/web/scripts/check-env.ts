// script/check-env.ts
// 检查环境变量设置是否正确

import { config } from "dotenv";
import { pathToFileURL } from "url";
import Rlog from "rlog-js";

// 加载 .env 文件
config({
  quiet: true,
});

const rlog = new Rlog();

// 必需的环境变量配置
const REQUIRED_ENV_VARS = [
  {
    name: "DATABASE_URL",
    description: "Database connection string",
    validator: (value: string) => {
      if (!value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
        return "Must be a PostgreSQL connection string (postgresql:// or postgres://)";
      }
      return null;
    }
  },
  {
    name: "BUFFER",
    description: "Password hashing buffer",
    validator: (value: string) => {
      if (value.length < 10) {
        return "Should be at least 10 characters long for security";
      }
      return null;
    }
  },
  {
    name: "PEPPER",
    description: "Password hashing pepper",
    validator: (value: string) => {
      if (!value) {
        return "Should not be 'undefined', please set a proper value";
      }
      return null;
    }
  },
  {
    name: "JWT_PRIVATE_KEY",
    description: "JWT private key for token signing",
    validator: (value: string) => {
      if (!value.includes("BEGIN PRIVATE KEY") || !value.includes("END PRIVATE KEY")) {
        return "Should be a valid PEM format private key";
      }
      return null;
    }
  },
  {
    name: "JWT_PUBLIC_KEY",
    description: "JWT public key for token verification",
    validator: (value: string) => {
      if (!value.includes("BEGIN PUBLIC KEY") || !value.includes("END PUBLIC KEY")) {
        return "Should be a valid PEM format public key";
      }
      return null;
    }
  }
];

// 可选的环境变量配置
const OPTIONAL_ENV_VARS = [
  {
    name: "REDIS_URL",
    description: "Redis connection string (optional)",
    validator: (value: string) => {
      if (value && !value.startsWith("redis://")) {
        return "Should be a Redis connection string (redis://) if provided";
      }
      return null;
    }
  }
];

// 导出的环境检查函数
export async function checkEnvironmentVariables(): Promise<void> {
  rlog.info("> Starting environment variables check...");

  let hasErrors = false;
  let hasWarnings = false;

  // 检查必需的环境变量
  rlog.info("  Checking required environment variables:");
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name];
    
    if (!value) {
      rlog.error(`  ✗ ${envVar.name} is missing`);
      rlog.error(`    Description: ${envVar.description}`);
      hasErrors = true;
    } else {
      const validationError = envVar.validator(value);
      if (validationError) {
        rlog.error(`  ✗ ${envVar.name} is invalid: ${validationError}`);
        hasErrors = true;
      } else {
        rlog.success(`  ✓ ${envVar.name} is set and valid`);
      }
    }
  }

  // 检查可选的环境变量
  rlog.info("  Checking optional environment variables:");
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar.name];
    
    if (!value) {
      rlog.info(`  ○ ${envVar.name} is not set (optional)`);
    } else {
      const validationError = envVar.validator(value);
      if (validationError) {
        rlog.warning(`  ! ${envVar.name} is set but invalid: ${validationError}`);
        hasWarnings = true;
      } else {
        rlog.success(`  ✓ ${envVar.name} is set and valid`);
      }
    }
  }

  // 总结检查结果
  if (hasErrors) {
    rlog.error("  Environment variables check failed!");
    rlog.error("  Please check your .env file and set the missing or invalid variables.");
    rlog.error("  Example .env file:");
    rlog.error("  DATABASE_URL=postgresql://user:password@host:port/database");
    rlog.error("  REDIS_URL=redis://localhost:6379");
    rlog.error("  BUFFER=your_secure_buffer_string");
    rlog.error("  PEPPER=your_secure_pepper_string");
    rlog.error("  JWT_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\"");
    rlog.error("  JWT_PUBLIC_KEY=\"-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----\"");
    throw new Error("Required environment variables are missing or invalid");
  }

  if (hasWarnings) {
    rlog.warning("  Environment variables check completed with warnings");
    rlog.warning("  Optional variables have issues but the system can still function");
  } else {
    rlog.success("  Environment variables check completed successfully!");
  }
}

// 主入口函数
async function main() {
  try {
    await checkEnvironmentVariables();
  } catch (error) {
    rlog.error(`Environment check failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// 检查是否是直接运行
function isMainModule(): boolean {
  try {
    // 检查当前文件是否是主模块
    const arg1 = process.argv[1];
    return import.meta.url === pathToFileURL(arg1 || '').href || 
           (arg1?.endsWith('check-env.ts') ?? false) ||
           (arg1?.endsWith('check-env.js') ?? false);
  } catch {
    return false;
  }
}

// 如果直接运行此脚本
if (isMainModule()) {
  main();
}