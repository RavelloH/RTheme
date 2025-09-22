"use client";

import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null; // 避免服务端渲染和客户端不一致
  }

  const getCurrentThemeIcon = () => {
    if (theme === "light") return "☀️";
    if (theme === "dark") return "🌙";
    return "🌓";
  };

  const getCurrentThemeLabel = () => {
    if (theme === "light") return "浅色";
    if (theme === "dark") return "深色";
    return "跟随系统";
  };

  return (
    <div className="relative group">
      <button
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
        aria-label="切换主题"
      >
        <span className="text-lg">{getCurrentThemeIcon()}</span>
        <span className="text-sm hidden sm:inline">
          {getCurrentThemeLabel()}
        </span>
      </button>

      <div className="absolute right-0 top-full mt-2 w-40 rounded-md bg-popover border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="p-1">
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm hover:bg-accent transition-colors ${
              theme === "light" ? "bg-accent" : ""
            }`}
            onClick={() => setTheme("light")}
          >
            <span>☀️</span>
            <span>浅色模式</span>
          </button>
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm hover:bg-accent transition-colors ${
              theme === "dark" ? "bg-accent" : ""
            }`}
            onClick={() => setTheme("dark")}
          >
            <span>🌙</span>
            <span>深色模式</span>
          </button>
          <button
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm hover:bg-accent transition-colors ${
              theme === "system" ? "bg-accent" : ""
            }`}
            onClick={() => setTheme("system")}
          >
            <span>🌓</span>
            <span>跟随系统</span>
          </button>
        </div>
      </div>
    </div>
  );
}
