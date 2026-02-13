export interface SiteColorTokens {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  success: string;
  error: string;
  warning: string;
}

export interface SiteColorConfig {
  light: SiteColorTokens;
  dark: SiteColorTokens;
}

type LegacySiteColorConfig = {
  primary?: unknown;
  background?: unknown;
  muted?: unknown;
};

type SiteColorMode = keyof SiteColorConfig;

export const SITE_COLOR_TOKEN_TO_CSS_VARIABLE: Record<
  keyof SiteColorTokens,
  `--color-${string}`
> = {
  background: "--color-background",
  foreground: "--color-foreground",
  primary: "--color-primary",
  primaryForeground: "--color-primary-foreground",
  secondary: "--color-secondary",
  secondaryForeground: "--color-secondary-foreground",
  muted: "--color-muted",
  mutedForeground: "--color-muted-foreground",
  accent: "--color-accent",
  accentForeground: "--color-accent-foreground",
  border: "--color-border",
  input: "--color-input",
  ring: "--color-ring",
  success: "--color-success",
  error: "--color-error",
  warning: "--color-warning",
};

export const DEFAULT_SITE_COLOR_CONFIG: SiteColorConfig = {
  light: {
    background: "#ffffff",
    foreground: "#111111",
    primary: "#2dd4bf",
    primaryForeground: "#111111",
    secondary: "oklch(0.967 0.001 286.375)",
    secondaryForeground: "oklch(0.21 0.006 285.885)",
    muted: "oklch(0.967 0.001 286.375)",
    mutedForeground: "oklch(0.552 0.016 285.938)",
    accent: "oklch(0.967 0.001 286.375)",
    accentForeground: "oklch(0.21 0.006 285.885)",
    border: "oklch(0.92 0.004 286.32)",
    input: "oklch(0.92 0.004 286.32)",
    ring: "#0d9488",
    success: "#16a34a",
    error: "#dc2626",
    warning: "#ca8a04",
  },
  dark: {
    background: "oklch(0.1776 0 0)",
    foreground: "oklch(0.9672 0 0)",
    primary: "oklch(0.7845 0.1325 181.91)",
    primaryForeground: "oklch(0.1776 0 0)",
    secondary: "oklch(0.274 0.006 286.033)",
    secondaryForeground: "oklch(0.835 0.0077 260.73)",
    muted: "oklch(0.244 0.006 286.033)",
    mutedForeground: "oklch(0.705 0.015 286.067)",
    accent: "oklch(0.274 0.006 286.033)",
    accentForeground: "oklch(0.985 0 0)",
    border: "oklch(100% 0.00011 271.152 / 0.1)",
    input: "oklch(1 0 0 / 15%)",
    ring: "#0d9488",
    success: "#22c55e",
    error: "#ef4444",
    warning: "#eab308",
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneDefaultConfig(): SiteColorConfig {
  return {
    light: { ...DEFAULT_SITE_COLOR_CONFIG.light },
    dark: { ...DEFAULT_SITE_COLOR_CONFIG.dark },
  };
}

function pickColorValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeThemeTokens(
  theme: unknown,
  fallback: SiteColorTokens,
): SiteColorTokens {
  const source = isRecord(theme) ? theme : {};

  return {
    background: pickColorValue(source.background) ?? fallback.background,
    foreground: pickColorValue(source.foreground) ?? fallback.foreground,
    primary: pickColorValue(source.primary) ?? fallback.primary,
    primaryForeground:
      pickColorValue(source.primaryForeground) ?? fallback.primaryForeground,
    secondary: pickColorValue(source.secondary) ?? fallback.secondary,
    secondaryForeground:
      pickColorValue(source.secondaryForeground) ??
      fallback.secondaryForeground,
    muted: pickColorValue(source.muted) ?? fallback.muted,
    mutedForeground:
      pickColorValue(source.mutedForeground) ?? fallback.mutedForeground,
    accent: pickColorValue(source.accent) ?? fallback.accent,
    accentForeground:
      pickColorValue(source.accentForeground) ?? fallback.accentForeground,
    border: pickColorValue(source.border) ?? fallback.border,
    input: pickColorValue(source.input) ?? fallback.input,
    ring: pickColorValue(source.ring) ?? fallback.ring,
    success: pickColorValue(source.success) ?? fallback.success,
    error: pickColorValue(source.error) ?? fallback.error,
    warning: pickColorValue(source.warning) ?? fallback.warning,
  };
}

function normalizeLegacyConfig(
  siteColor: LegacySiteColorConfig,
): SiteColorConfig {
  const primary = pickColorValue(siteColor.primary);

  const background = isRecord(siteColor.background) ? siteColor.background : {};
  const muted = isRecord(siteColor.muted) ? siteColor.muted : {};

  return {
    light: {
      ...DEFAULT_SITE_COLOR_CONFIG.light,
      primary: primary ?? DEFAULT_SITE_COLOR_CONFIG.light.primary,
      background:
        pickColorValue(background.light) ??
        DEFAULT_SITE_COLOR_CONFIG.light.background,
      muted:
        pickColorValue(muted.light) ?? DEFAULT_SITE_COLOR_CONFIG.light.muted,
    },
    dark: {
      ...DEFAULT_SITE_COLOR_CONFIG.dark,
      primary: primary ?? DEFAULT_SITE_COLOR_CONFIG.dark.primary,
      background:
        pickColorValue(background.dark) ??
        DEFAULT_SITE_COLOR_CONFIG.dark.background,
      muted: pickColorValue(muted.dark) ?? DEFAULT_SITE_COLOR_CONFIG.dark.muted,
    },
  };
}

export function normalizeSiteColorConfig(siteColor: unknown): SiteColorConfig {
  if (!isRecord(siteColor)) {
    return cloneDefaultConfig();
  }

  const hasModeStructure =
    "light" in siteColor ||
    "dark" in siteColor ||
    (isRecord(siteColor.light) && isRecord(siteColor.dark));

  if (hasModeStructure) {
    return {
      light: normalizeThemeTokens(
        siteColor.light,
        DEFAULT_SITE_COLOR_CONFIG.light,
      ),
      dark: normalizeThemeTokens(
        siteColor.dark,
        DEFAULT_SITE_COLOR_CONFIG.dark,
      ),
    };
  }

  return normalizeLegacyConfig(siteColor);
}

export function getSiteColorTokens(
  siteColor: unknown,
  mode: SiteColorMode,
): SiteColorTokens {
  const normalized = normalizeSiteColorConfig(siteColor);
  return mode === "dark" ? normalized.dark : normalized.light;
}

export function getSitePrimaryColor(
  siteColor: unknown,
  mode: SiteColorMode = "light",
): string {
  return getSiteColorTokens(siteColor, mode).primary;
}
