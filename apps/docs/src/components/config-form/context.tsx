"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

// 香农熵计算
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

// 环境变量配置
export interface EnvConfig {
  DATABASE_URL: string;
  REDIS_URL: string;
  MASTER_SECRET: string;
  JWT_PRIVATE_KEY: string;
  JWT_PUBLIC_KEY: string;
  LANG: string;
}

// 验证错误
export interface ValidationError {
  field: keyof EnvConfig;
  message: string;
}

// 验证函数
function validateDatabaseUrl(value: string): string | null {
  if (!value) return "数据库连接字符串不能为空";
  if (!value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
    return "必须是 PostgreSQL 连接字符串 (postgresql:// 或 postgres://)";
  }
  // 简单格式验证
  const pattern = /^postgresql?:\/\/.+@.+(?::\d+)?\/.+$/;
  if (!pattern.test(value)) {
    return "连接字符串格式不正确，应为: postgresql://用户名:密码@主机[:端口]/数据库名";
  }
  return null;
}

function validateRedisUrl(value: string): string | null {
  if (!value) return "Redis 连接字符串不能为空";
  if (!value.startsWith("redis://") && !value.startsWith("rediss://")) {
    return "必须是有效的 Redis 连接字符串 (redis:// 或 rediss://)";
  }
  return null;
}

function validateMasterSecret(value: string): string | null {
  if (!value) return "主密钥不能为空";
  if (value.length < 32) {
    return "长度应至少 32 个字符以确保安全";
  }
  const entropy = calculateShannonEntropy(value);
  if (entropy < 3.5) {
    return `熵值过低 (${entropy.toFixed(2)})，请使用更随机的密钥 (建议 > 3.5)`;
  }
  return null;
}

function validateJwtPrivateKey(value: string): string | null {
  if (!value) return "JWT 私钥不能为空";
  if (
    !value.includes("BEGIN PRIVATE KEY") ||
    !value.includes("END PRIVATE KEY")
  ) {
    return "应该是有效的 PEM 格式私钥";
  }
  return null;
}

function validateJwtPublicKey(value: string): string | null {
  if (!value) return "JWT 公钥不能为空";
  if (
    !value.includes("BEGIN PUBLIC KEY") ||
    !value.includes("END PUBLIC KEY")
  ) {
    return "应该是有效的 PEM 格式公钥";
  }
  return null;
}

interface ConfigContextType {
  config: EnvConfig;
  setConfig: (config: Partial<EnvConfig>) => void;
  errors: ValidationError[];
  validateAll: () => boolean;
  generateMissing: () => void;
  isReady: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

const DEFAULT_CONFIG: EnvConfig = {
  DATABASE_URL: "",
  REDIS_URL: "",
  MASTER_SECRET: "",
  JWT_PRIVATE_KEY: "",
  JWT_PUBLIC_KEY: "",
  LANG: "zh_CN",
};

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<EnvConfig>(DEFAULT_CONFIG);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // 从 localStorage 加载配置
  useEffect(() => {
    const saved = localStorage.getItem("neutralpress-env-config");
    if (saved) {
      try {
        setConfigState(JSON.parse(saved));
      } catch (e) {
        console.error("加载配置失败:", e);
      }
    }
  }, []);

  // 保存到 localStorage
  const setConfig = (newConfig: Partial<EnvConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfigState(updated);
    localStorage.setItem("neutralpress-env-config", JSON.stringify(updated));
    // 清除此字段的错误
    setErrors((prev) =>
      prev.filter(
        (e) =>
          !(Object.keys(newConfig) as Array<keyof EnvConfig>).includes(e.field),
      ),
    );
  };

  // 生成 ECDSA 密钥对 (ES256 - P-256)
  const generateKeyPair = async (): Promise<{
    privateKey: string;
    publicKey: string;
  }> => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"],
    );

    const privateKeyBuffer = await crypto.subtle.exportKey(
      "pkcs8",
      keyPair.privateKey,
    );
    const publicKeyBuffer = await crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey,
    );

    // 转换为 PEM 格式
    const privateKeyPem = [
      "-----BEGIN PRIVATE KEY-----",
      ...btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer))).match(
        /.{1,64}/g,
      )!,
      "-----END PRIVATE KEY-----",
    ].join("\n");

    const publicKeyPem = [
      "-----BEGIN PUBLIC KEY-----",
      ...btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer))).match(
        /.{1,64}/g,
      )!,
      "-----END PUBLIC KEY-----",
    ].join("\n");

    return { privateKey: privateKeyPem, publicKey: publicKeyPem };
  };

  // 生成随机密钥
  const generateRandomSecret = (): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
  };

  // 生成缺失的配置
  const generateMissing = async () => {
    const newConfig: Partial<EnvConfig> = {};

    if (!config.MASTER_SECRET) {
      newConfig.MASTER_SECRET = generateRandomSecret();
    }

    if (!config.JWT_PRIVATE_KEY || !config.JWT_PUBLIC_KEY) {
      const { privateKey, publicKey } = await generateKeyPair();
      if (!config.JWT_PRIVATE_KEY) newConfig.JWT_PRIVATE_KEY = privateKey;
      if (!config.JWT_PUBLIC_KEY) newConfig.JWT_PUBLIC_KEY = publicKey;
    }

    if (Object.keys(newConfig).length > 0) {
      setConfig(newConfig);
    }
  };

  // 验证所有字段
  const validateAll = (): boolean => {
    const newErrors: ValidationError[] = [];

    const dbError = validateDatabaseUrl(config.DATABASE_URL);
    if (dbError) newErrors.push({ field: "DATABASE_URL", message: dbError });

    const redisError = validateRedisUrl(config.REDIS_URL);
    if (redisError) newErrors.push({ field: "REDIS_URL", message: redisError });

    const masterError = validateMasterSecret(config.MASTER_SECRET);
    if (masterError)
      newErrors.push({ field: "MASTER_SECRET", message: masterError });

    const privateKeyError = validateJwtPrivateKey(config.JWT_PRIVATE_KEY);
    if (privateKeyError)
      newErrors.push({ field: "JWT_PRIVATE_KEY", message: privateKeyError });

    const publicKeyError = validateJwtPublicKey(config.JWT_PUBLIC_KEY);
    if (publicKeyError)
      newErrors.push({ field: "JWT_PUBLIC_KEY", message: publicKeyError });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const isReady = !!(config.DATABASE_URL && config.REDIS_URL);

  return (
    <ConfigContext.Provider
      value={{
        config,
        setConfig,
        errors,
        validateAll,
        generateMissing,
        isReady,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfigContext() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfigContext must be used within ConfigProvider");
  }
  return context;
}
