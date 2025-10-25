"use client";

import { ColorConfig } from "@/types/config";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect } from "react";

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider> & {
  mainColor: ColorConfig;
};

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
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
