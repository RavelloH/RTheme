import "server-only";

import argon2 from "argon2";
import { cpus } from "os";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 密码处理错误类型
 */
export enum PasswordErrorType {
  INVALID_INPUT = "INVALID_INPUT",
  HASHING_FAILED = "HASHING_FAILED",
  VERIFICATION_FAILED = "VERIFICATION_FAILED",
  CONFIG_ERROR = "CONFIG_ERROR",
  SYSTEM_ERROR = "SYSTEM_ERROR",
}

/**
 * 密码处理错误
 */
export class PasswordError extends Error {
  constructor(
    public type: PasswordErrorType,
    message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "PasswordError";
  }
}

/**
 * Argon2 配置选项
 */
interface Argon2Options {
  /** 时间成本 (迭代次数) */
  timeCost: number;
  /** 内存成本 (KB) */
  memoryCost: number;
  /** 并行度 */
  parallelism: number;
  /** 输出哈希长度 */
  hashLength: number;
  /** 算法类型 */
  type: typeof argon2.argon2id | typeof argon2.argon2i | typeof argon2.argon2d;
}

/**
 * 环境配置
 */
interface PasswordConfig {
  /** 缓冲字符串 */
  buffer: string;
  /** Pepper 字符串 */
  pepper: string;
  /** Argon2 配置 */
  argon2: Argon2Options;
}

// ============================================================================
// 配置
// ============================================================================

/**
 * 获取动态并行度（基于 CPU 核心数）
 */
function getDynamicParallelism(): number {
  const cores = cpus().length;
  // 使用 CPU 核心数的一半，最少 1，最多 8
  return Math.max(1, Math.min(8, Math.floor(cores / 2)));
}

/**
 * 验证和获取环境配置
 */
function getPasswordConfig(): PasswordConfig {
  const buffer = process.env.BUFFER;
  const pepper = process.env.PEPPER;

  if (!buffer || buffer.length < 8) {
    throw new PasswordError(
      PasswordErrorType.CONFIG_ERROR,
      "BUFFER 环境变量必须设置且长度至少为 8 个字符",
    );
  }

  if (!pepper || pepper.length < 8) {
    throw new PasswordError(
      PasswordErrorType.CONFIG_ERROR,
      "PEPPER 环境变量必须设置且长度至少为 8 个字符",
    );
  }

  return {
    buffer,
    pepper,
    argon2: {
      timeCost: parseInt(process.env.ARGON2_TIME_COST || "3", 10),
      memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || "262144", 10),
      parallelism: parseInt(
        process.env.ARGON2_PARALLELISM || getDynamicParallelism().toString(),
        10,
      ),
      hashLength: parseInt(process.env.ARGON2_HASH_LENGTH || "32", 10),
      type: argon2.argon2id,
    },
  };
}

/**
 * 全局配置实例（延迟初始化）
 */
let config: PasswordConfig | null = null;

/**
 * 获取配置实例
 */
function getConfig(): PasswordConfig {
  if (!config) {
    config = getPasswordConfig();
  }
  return config;
}

// ============================================================================
// 内部工具函数
// ============================================================================

/**
 * 密码预处理函数 - 添加 salt 和 pepper
 * @param password 原始密码
 * @returns 处理后的密码字符串
 */
function preprocessPassword(password: string): string {
  const { buffer, pepper } = getConfig();

  let result = "";
  let bufferIndex = 0;

  // 将缓冲字符与密码字符交替插入
  for (let i = 0; i < password.length; i++) {
    const passwordChar = password.charAt(i); // 使用 charAt 确保类型安全
    const bufferChar = buffer.charAt(bufferIndex); // 使用 charAt 确保类型安全
    result += passwordChar + bufferChar;
    bufferIndex = (bufferIndex + 1) % buffer.length;
  }

  // 添加 pepper
  return result + pepper;
}

// ============================================================================
// 导出函数
// ============================================================================

/**
 * 使用 Argon2id 加密密码
 * @param password 原始密码
 * @param customOptions 自定义 Argon2 配置（可选）
 * @returns 加密后的哈希值
 * @throws {PasswordError} 当加密失败时抛出错误
 */
export async function hashPassword(
  password: string,
  customOptions: Partial<Argon2Options> = {},
): Promise<string> {
  try {
    // 验证输入
    if (!password || typeof password !== "string") {
      throw new PasswordError(
        PasswordErrorType.INVALID_INPUT,
        "密码必须是非空字符串",
      );
    }

    if (password.length < 1) {
      throw new PasswordError(
        PasswordErrorType.INVALID_INPUT,
        "密码长度不能为空",
      );
    }

    const config = getConfig();

    // 预处理密码
    const processedPassword = preprocessPassword(password);

    // 合并配置
    const finalOptions = { ...config.argon2, ...customOptions };

    // 生成哈希
    const hash = await argon2.hash(processedPassword, finalOptions);

    return hash;
  } catch (error) {
    if (error instanceof PasswordError) {
      throw error;
    }

    console.error("密码加密失败:", error);
    throw new PasswordError(
      PasswordErrorType.HASHING_FAILED,
      "密码加密过程中发生错误",
      error,
    );
  }
}

/**
 * 验证密码结果
 */
export interface VerifyPasswordResult {
  /** 验证是否成功 */
  isValid: boolean;
  /** 错误信息（如果有） */
  error?: PasswordError;
}

/**
 * 验证密码是否匹配
 * @param hashedPassword 存储的哈希值
 * @param password 待验证的原始密码
 * @returns 验证结果对象
 */
export async function verifyPassword(
  hashedPassword: string,
  password: string,
): Promise<VerifyPasswordResult> {
  try {
    // 验证输入
    if (!hashedPassword || typeof hashedPassword !== "string") {
      return {
        isValid: false,
        error: new PasswordError(
          PasswordErrorType.INVALID_INPUT,
          "哈希值必须是非空字符串",
        ),
      };
    }

    if (!password || typeof password !== "string") {
      return {
        isValid: false,
        error: new PasswordError(
          PasswordErrorType.INVALID_INPUT,
          "密码必须是非空字符串",
        ),
      };
    }

    // 预处理密码（与加密时保持一致）
    const processedPassword = preprocessPassword(password);

    // 验证密码
    const isValid = await argon2.verify(hashedPassword, processedPassword);

    return { isValid };
  } catch (error) {
    console.error("密码验证失败:", error);

    return {
      isValid: false,
      error: new PasswordError(
        PasswordErrorType.VERIFICATION_FAILED,
        "密码验证过程中发生错误",
        error,
      ),
    };
  }
}

/**
 * 检查密码是否需要重新哈希（配置变更时）
 * @param hashedPassword 存储的哈希值
 * @param customOptions 新的配置选项
 * @returns 是否需要重新哈希
 */
export function needsRehash(
  hashedPassword: string,
  customOptions: Partial<Argon2Options> = {},
): boolean {
  try {
    if (!hashedPassword || typeof hashedPassword !== "string") {
      return true; // 无效哈希值，建议重新哈希
    }

    const config = getConfig();
    const finalOptions = { ...config.argon2, ...customOptions };

    return argon2.needsRehash(hashedPassword, finalOptions);
  } catch (error) {
    console.error("检查重新哈希需求失败:", error);
    // 出错时建议重新哈希以确保安全
    return true;
  }
}

/**
 * 简化的验证函数（向后兼容）
 * @param hashedPassword 存储的哈希值
 * @param password 待验证的原始密码
 * @returns 是否匹配
 */
export async function verifyPasswordSimple(
  hashedPassword: string,
  password: string,
): Promise<boolean> {
  const result = await verifyPassword(hashedPassword, password);
  return result.isValid;
}

/**
 * 重置配置缓存（主要用于测试）
 */
export function resetConfigCache(): void {
  config = null;
}
