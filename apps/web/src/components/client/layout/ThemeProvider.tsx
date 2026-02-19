"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { RiMoonLine, RiSunLine } from "@remixicon/react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

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

export type ThemeMode = "light" | "dark";

type ThemeOptionMeta = {
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number | string }>;
};

type MainColorContextValue = SiteColorConfig & {
  // 兼容旧代码中的 useMainColor().primary 访问
  primary: string;
};

type ThemeTransitionContextValue = {
  selectedTheme: ThemeMode;
  pendingTheme: ThemeMode | null;
  isMounted: boolean;
  isTransitioning: boolean;
  switchThemeWithMask: (
    theme: ThemeMode,
    triggerElement?: HTMLElement | null,
  ) => void;
};

const COLOR_STYLE_ID = "site-color-overrides";
const THEME_MASK_ENTER_MS = 420;
const THEME_COMMIT_DELAY_MS = 300;
const THEME_MASK_EXIT_DELAY_MS = 32;
const THEME_MASK_EXIT_MS = 420;
const THEME_MASK_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

export const THEME_OPTION_META: Record<ThemeMode, ThemeOptionMeta> = {
  light: { label: "浅色", icon: RiSunLine },
  dark: { label: "深色", icon: RiMoonLine },
};

const ColorContext = createContext<MainColorContextValue | null>(null);
const ThemeTransitionContext =
  createContext<ThemeTransitionContextValue | null>(null);

type TriggerSnapshot = {
  top: number;
  left: number;
  width: number;
  height: number;
  className: string;
  contentHtml: string;
  textColor: string;
  borderColor: string;
  activeTextColor: string;
  activeBackgroundColor: string;
  activeBorderColor: string;
};

function resolveCssColor(ownerDocument: Document, colorValue: string): string {
  const probe = ownerDocument.createElement("div");
  probe.style.color = colorValue;
  probe.style.position = "fixed";
  probe.style.left = "-9999px";
  probe.style.top = "-9999px";
  probe.style.pointerEvents = "none";
  probe.style.visibility = "hidden";

  ownerDocument.body.appendChild(probe);
  const computed = window.getComputedStyle(probe);
  const resolvedColor = computed.color;
  ownerDocument.body.removeChild(probe);

  return resolvedColor;
}

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
    // sheet.insertRule(":root {}", 0);
    // TODO: 我还没做亮色主题，所以先跳过
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

function normalizeTheme(theme: string | undefined): ThemeMode {
  if (theme === "light" || theme === "dark") {
    return theme;
  }
  return "dark";
}

function ThemeTransitionLayer({
  children,
  siteColor,
}: {
  children: React.ReactNode;
  siteColor: SiteColorConfig;
}) {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<ThemeMode | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [maskVisible, setMaskVisible] = useState(false);
  const [maskScale, setMaskScale] = useState(0);
  const [maskOrigin, setMaskOrigin] = useState<"left center" | "right center">(
    "left center",
  );
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [triggerSnapshot, setTriggerSnapshot] =
    useState<TriggerSnapshot | null>(null);
  const [isSnapshotActive, setIsSnapshotActive] = useState(false);

  const enterTimerRef = useRef<number | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const exitDelayTimerRef = useRef<number | null>(null);
  const exitTimerRef = useRef<number | null>(null);

  const selectedTheme = normalizeTheme(theme);

  const clearTimers = useCallback(() => {
    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }

    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }

    if (exitDelayTimerRef.current !== null) {
      window.clearTimeout(exitDelayTimerRef.current);
      exitDelayTimerRef.current = null;
    }

    if (exitTimerRef.current !== null) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!isMounted) return;
    if (theme === "system") {
      setTheme("dark");
    }
  }, [isMounted, setTheme, theme]);

  const switchThemeWithMask = useCallback(
    (nextTheme: ThemeMode, triggerElement?: HTMLElement | null) => {
      if (!isMounted) return;
      if (selectedTheme === nextTheme) return;
      if (isTransitioning) return;

      clearTimers();

      if (prefersReducedMotion) {
        setTheme(nextTheme);
        return;
      }

      if (triggerElement) {
        const rect = triggerElement.getBoundingClientRect();
        const triggerComputed = window.getComputedStyle(triggerElement);
        const nextTokens =
          nextTheme === "dark" ? siteColor.dark : siteColor.light;
        const activeTextColor = resolveCssColor(
          triggerElement.ownerDocument,
          nextTokens.primaryForeground,
        );
        const activeBackgroundColor = resolveCssColor(
          triggerElement.ownerDocument,
          nextTokens.primary,
        );
        const activeBorderColor = activeBackgroundColor;

        setTriggerSnapshot({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          className: triggerElement.className,
          contentHtml: triggerElement.innerHTML,
          textColor: triggerComputed.color,
          borderColor: triggerComputed.borderColor,
          activeTextColor,
          activeBackgroundColor,
          activeBorderColor,
        });
      } else {
        setTriggerSnapshot(null);
      }
      setIsSnapshotActive(false);

      setPendingTheme(nextTheme);
      setIsTransitioning(true);
      setMaskVisible(true);
      setMaskOrigin("left center");
      setMaskScale(0);

      window.requestAnimationFrame(() => {
        setMaskScale(1);
      });

      enterTimerRef.current = window.setTimeout(() => {
        setIsSnapshotActive(true);

        commitTimerRef.current = window.setTimeout(() => {
          setTheme(nextTheme);

          exitDelayTimerRef.current = window.setTimeout(() => {
            setMaskOrigin("right center");
            setMaskScale(0);
          }, THEME_MASK_EXIT_DELAY_MS);

          exitTimerRef.current = window.setTimeout(() => {
            setMaskVisible(false);
            setPendingTheme(null);
            setTriggerSnapshot(null);
            setIsSnapshotActive(false);
            setIsTransitioning(false);
          }, THEME_MASK_EXIT_DELAY_MS + THEME_MASK_EXIT_MS);
        }, THEME_COMMIT_DELAY_MS);
      }, THEME_MASK_ENTER_MS);
    },
    [
      clearTimers,
      isMounted,
      isTransitioning,
      prefersReducedMotion,
      selectedTheme,
      siteColor.dark,
      siteColor.light,
      setTheme,
    ],
  );

  const themeTransitionValue = useMemo<ThemeTransitionContextValue>(
    () => ({
      selectedTheme,
      pendingTheme,
      isMounted,
      isTransitioning,
      switchThemeWithMask,
    }),
    [
      isMounted,
      isTransitioning,
      pendingTheme,
      selectedTheme,
      switchThemeWithMask,
    ],
  );

  const maskDuration = maskScale > 0 ? THEME_MASK_ENTER_MS : THEME_MASK_EXIT_MS;

  return (
    <ThemeTransitionContext.Provider value={themeTransitionValue}>
      {children}

      {maskVisible ? (
        <div className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden">
          <div
            className="absolute inset-0 bg-primary"
            style={{
              transform: `scaleX(${maskScale})`,
              transformOrigin: maskOrigin,
              transitionProperty: "transform",
              transitionTimingFunction: THEME_MASK_EASING,
              transitionDuration: `${maskDuration}ms`,
            }}
          />
        </div>
      ) : null}

      {maskVisible && triggerSnapshot && typeof document !== "undefined"
        ? createPortal(
            <div className="pointer-events-none fixed inset-0 z-[100000]">
              <div
                className={`${triggerSnapshot.className} ${
                  isSnapshotActive ? "!bg-primary" : ""
                }`}
                style={{
                  position: "fixed",
                  top: `${triggerSnapshot.top}px`,
                  left: `${triggerSnapshot.left}px`,
                  width: `${triggerSnapshot.width}px`,
                  height: `${triggerSnapshot.height}px`,
                  margin: 0,
                  color: isSnapshotActive
                    ? triggerSnapshot.activeTextColor
                    : triggerSnapshot.textColor,
                  backgroundColor: isSnapshotActive
                    ? triggerSnapshot.activeBackgroundColor
                    : "transparent",
                  borderColor: isSnapshotActive
                    ? triggerSnapshot.activeBorderColor
                    : triggerSnapshot.borderColor,
                  transition:
                    "color 240ms ease, background-color 240ms ease, border-color 240ms ease",
                }}
                dangerouslySetInnerHTML={{
                  __html: triggerSnapshot.contentHtml,
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </ThemeTransitionContext.Provider>
  );
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

/**
 * 获取全局主题切换控制器
 * 必须在 ThemeProvider 内部使用
 */
export function useThemeTransition() {
  const context = useContext(ThemeTransitionContext);
  if (!context) {
    throw new Error("useThemeTransition must be used within ThemeProvider");
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
      <NextThemesProvider {...props}>
        <ThemeTransitionLayer siteColor={normalizedColor}>
          {children}
        </ThemeTransitionLayer>
      </NextThemesProvider>
    </ColorContext.Provider>
  );
}
