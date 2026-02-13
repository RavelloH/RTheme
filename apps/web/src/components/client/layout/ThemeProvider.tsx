"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

import {
  normalizeSiteColorConfig,
  SITE_COLOR_TOKEN_TO_CSS_VARIABLE,
  type SiteColorConfig,
  type SiteColorTokens,
} from "@/lib/shared/site-color";
import type { ConfigType } from "@/types/config";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider> & {
  mainColor: ConfigType<"site.color">;
};

type MainColorContextValue = SiteColorConfig & {
  // 兼容旧代码中的 useMainColor().primary 访问
  primary: string;
};

const COLOR_STYLE_ID = "site-color-overrides";

const ColorContext = createContext<MainColorContextValue | null>(null);

function applyThemeTokens(
  style: CSSStyleDeclaration,
  tokens: SiteColorTokens,
): void {
  (
    Object.keys(SITE_COLOR_TOKEN_TO_CSS_VARIABLE) as (keyof SiteColorTokens)[]
  ).forEach((tokenKey) => {
    style.setProperty(
      SITE_COLOR_TOKEN_TO_CSS_VARIABLE[tokenKey],
      tokens[tokenKey],
    );
  });
}

function ensureColorRules(
  styleElement: HTMLStyleElement,
): [CSSStyleRule, CSSStyleRule] | null {
  const sheet = styleElement.sheet;
  if (!sheet) return null;

  if (sheet.cssRules.length === 0) {
    sheet.insertRule(":root {}", 0);
    sheet.insertRule("html.dark {}", 1);
  }

  const rootRule = sheet.cssRules[0];
  const darkRule = sheet.cssRules[1];

  if (
    !(rootRule instanceof CSSStyleRule) ||
    !(darkRule instanceof CSSStyleRule)
  ) {
    return null;
  }

  return [rootRule, darkRule];
}

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
  const normalizedColor = useMemo(
    () => normalizeSiteColorConfig(mainColor),
    [mainColor],
  );
  const [activePrimary, setActivePrimary] = useState(
    normalizedColor.light.primary,
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    let styleElement = document.getElementById(
      COLOR_STYLE_ID,
    ) as HTMLStyleElement | null;

    if (!styleElement) {
      styleElement = document.createElement("style");
      styleElement.id = COLOR_STYLE_ID;
      document.head.appendChild(styleElement);
    }

    const rules = ensureColorRules(styleElement);
    if (!rules) return;

    const [rootRule, darkRule] = rules;
    applyThemeTokens(rootRule.style, normalizedColor.light);
    applyThemeTokens(darkRule.style, normalizedColor.dark);
  }, [normalizedColor]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const html = document.documentElement;
    const syncPrimaryWithCurrentTheme = () => {
      const nextPrimary = html.classList.contains("dark")
        ? normalizedColor.dark.primary
        : normalizedColor.light.primary;
      setActivePrimary((prev) => (prev === nextPrimary ? prev : nextPrimary));
    };

    syncPrimaryWithCurrentTheme();

    const observer = new MutationObserver(syncPrimaryWithCurrentTheme);
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [normalizedColor.dark.primary, normalizedColor.light.primary]);

  const contextValue = useMemo<MainColorContextValue>(
    () => ({
      ...normalizedColor,
      primary: activePrimary,
    }),
    [activePrimary, normalizedColor],
  );

  return (
    <ColorContext.Provider value={contextValue}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ColorContext.Provider>
  );
}
