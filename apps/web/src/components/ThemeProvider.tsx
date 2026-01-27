"use client";

import type { ConfigType } from "@/types/config";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { createContext, useContext, useEffect } from "react";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider> & {
  mainColor: ConfigType<"site.color">;
};

// 创建 Context
const ColorContext = createContext<ConfigType<"site.color"> | null>(null);

/**
 * 获取主题颜色配置的 Hook
 * 必须在 ThemeProvider 内部使用
 */
export function useMainColor() {
  const context = useContext(ColorContext);
  if (!context) {
    throw new Error("useMainColor must be used within ThemeProvider");
  }
  return context;
}

export function ThemeProvider({
  children,
  mainColor,
  ...props
}: ThemeProviderProps) {
  useEffect(() => {
    if (typeof document === "undefined" || typeof mainColor === "undefined")
      return;
    document.documentElement.style.setProperty(
      "--color-primary",
      mainColor.primary || "#2dd4bf",
    );
    document.documentElement.style.setProperty(
      "--color-background",
      mainColor.background.dark || "#111111",
    );
    document.documentElement.style.setProperty(
      "--color-muted",
      mainColor.muted.dark || "#111111",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ColorContext.Provider value={mainColor}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ColorContext.Provider>
  );
}
