"use client";

import React, { createContext, useContext } from "react";
import { ConfigItem } from "@/lib/server/configCache";

interface ConfigContextType {
  configs: Record<string, ConfigItem>;
  getConfig: (key: string) => ConfigItem | null;
  getConfigValue: (
    key: string,
    defaultValue?: unknown,
    field?: string,
  ) => unknown;
  config: <T>(key: string, defaultValue?: T, field?: string) => T;
}

// 配置值的类型定义
interface ConfigValueObject {
  [key: string]: unknown;
  default?: unknown;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({
  children,
  configs,
}: {
  children: React.ReactNode;
  configs: Record<string, ConfigItem>;
}) {
  const getConfig = (key: string): ConfigItem | null => {
    return configs[key] || null;
  };

  const getConfigValue = (
    key: string,
    defaultValue?: unknown,
    field?: string,
  ): unknown => {
    const config = getConfig(key);

    // 如果配置不存在，返回默认值
    if (!config?.value) {
      return defaultValue;
    }

    const configValue = config.value;

    // 如果指定了字段名且配置值是对象，尝试获取指定字段
    if (field && typeof configValue === "object" && configValue !== null) {
      return (configValue as ConfigValueObject)[field] ?? defaultValue;
    }

    // 如果没有指定字段，但配置值是对象且有default属性，返回default值
    if (
      !field &&
      typeof configValue === "object" &&
      configValue !== null &&
      "default" in configValue
    ) {
      return (configValue as ConfigValueObject).default;
    }

    // 如果配置值是对象，返回整个对象
    if (typeof configValue === "object" && configValue !== null) {
      return configValue;
    }

    // 返回配置值本身
    return configValue;
  };

  const config = function <T>(
    key: string,
    defaultValue?: T,
    field?: string,
  ): T {
    const value = getConfigValue(key, defaultValue, field);
    return value as T;
  };

  return (
    <ConfigContext.Provider
      value={{
        configs,
        getConfig,
        getConfigValue,
        config,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
}
