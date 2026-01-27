"use client";

import { createContext, useContext, ReactNode } from "react";

interface ConfigContextType {
  configs: Record<string, unknown>;
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
 *   "site.theme": { light: "light-plus", dark: "dark-plus" },
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
  configs: Record<string, unknown>;
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
 * @returns 配置值，类型为 unknown，需要配合 ConfigType 使用
 *
 * @example
 * import type { ConfigType } from "@/data/default-configs";
 *
 * const shikiTheme = useConfig("site.theme") as ConfigType<"site.theme">;
 * // theme 自动推导为 { light: string; dark: string; }
 */
export function useConfig(key: string): unknown {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error(`useConfig("${key}") must be used within ConfigProvider`);
  }
  return context.configs[key];
}

/**
 * 获取所有配置的 Hook
 *
 * @example
 * const configs = useConfigs();
 * console.log(configs["site.theme"]);
 */
export function useConfigs(): Record<string, unknown> {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error("useConfigs must be used within ConfigProvider");
  }
  return context.configs;
}
