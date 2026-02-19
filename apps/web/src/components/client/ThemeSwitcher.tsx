"use client";

import {
  THEME_OPTION_META,
  type ThemeMode,
  useThemeTransition,
} from "@/components/client/layout/ThemeProvider";

const THEME_OPTIONS: ThemeMode[] = ["light", "dark"];
const THEME_MENU_LABEL: Record<ThemeMode, string> = {
  light: "浅色模式",
  dark: "深色模式",
};

export function ThemeSwitcher() {
  const { selectedTheme, isMounted, isTransitioning, switchThemeWithMask } =
    useThemeTransition();

  if (!isMounted) {
    return null; // 避免服务端渲染和客户端不一致
  }

  const currentTheme = selectedTheme;
  const currentMeta = THEME_OPTION_META[currentTheme];
  const CurrentThemeIcon = currentMeta.icon;

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        aria-label="切换主题"
        disabled={isTransitioning}
      >
        <CurrentThemeIcon size="1.2em" />
        <span className="text-sm hidden sm:inline">
          {THEME_MENU_LABEL[currentTheme]}
        </span>
      </button>

      <div className="absolute right-0 top-full mt-2 w-40 rounded-md bg-popover border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="p-1">
          {THEME_OPTIONS.map((option) => {
            const optionMeta = THEME_OPTION_META[option];
            const OptionIcon = optionMeta.icon;
            const isActive = currentTheme === option;

            return (
              <button
                key={option}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm hover:bg-accent transition-colors disabled:cursor-not-allowed disabled:opacity-65 ${
                  isActive ? "bg-accent" : ""
                }`}
                onClick={(event) =>
                  switchThemeWithMask(option, event.currentTarget)
                }
                disabled={isTransitioning}
              >
                <OptionIcon size="1.05em" />
                <span>{THEME_MENU_LABEL[option]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
