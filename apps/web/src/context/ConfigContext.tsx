"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type {
  ConfigKeys,
  ConfigType,
  ConfigTypeMap,
} from "@/data/default-configs";

interface ConfigContextType {
  configs: Partial<ConfigTypeMap>;
}

const ConfigContext = createContext<ConfigContextType | null>(null);

/**
 * 配置 Provider
 *
 * 在根布局中获取配置并传递给此 Provider
 *
 * @example
 * // 在 layout.tsx 中
 * const configs = {
 *   "site.title": "My Site",
 *   "comment.enable": true,
 * };
 *
 * <ConfigProvider configs={configs}>
 *   {children}
 * </ConfigProvider>
 */
export function ConfigProvider({
  children,
  configs,
}: {
  children: ReactNode;
  configs: Partial<ConfigTypeMap>;
}) {
  return (
    <ConfigContext.Provider value={{ configs }}>
      {children}
    </ConfigContext.Provider>
  );
}

/**
 * 获取配置的 Hook
 *
 * @param key 配置键
 * @returns 配置值，自动推导类型
 *
 * @example
 * const shikiTheme = useConfig("site.shiki.theme");
 * // theme 自动推导为 { light: string; dark: string; }
 */
export function useConfig<K extends ConfigKeys>(key: K): ConfigType<K> {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error(`useConfig("${key}") must be used within ConfigProvider`);
  }
  return context.configs[key] as ConfigType<K>;
}

/**
 * 获取所有配置的 Hook
 */
export function useConfigs(): Partial<ConfigTypeMap> {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfigs must be used within ConfigProvider");
  }
  return context.configs;
}
