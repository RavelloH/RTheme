// Main Layout
import "server-only";

// Fonts
import { Inter } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";

// Styles
import "./globals.css";

// Server Componments
import Header from "@/components/server/Header";
import FooterDesktopWrapper from "@/components/server/FooterDesktopWrapper";
import FooterMobileWrapper from "@/components/server/FooterMobileWrapper";

// Client Components
import { ThemeProvider } from "@/components/ThemeProvider";
import { MenuProvider } from "@/components/MenuProvider";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { MainContent } from "@/components/MainContent";
import { LayoutContainer } from "@/components/LayoutContainer";
import ResponsiveFontScale from "@/components/ResponsiveFontScale";
import PageTransition from "@/components/PageTransition";
import TokenManager from "@/components/TokenManager";
import { AnalyticsTracker } from "@/components/client/AnalyticsTracker";

// lib
import { getActiveMenus } from "@/lib/server/menu-cache";
import { getConfig } from "@/lib/server/config-cache";

// Types
import { ColorConfig } from "@/types/config";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [menus, mainColor, siteName, enableAnalytics] = await Promise.all([
    getActiveMenus(),
    getConfig<ColorConfig>("site.color"),
    getConfig<string>("site.title"),
    getConfig<boolean>("analytics.enable"),
  ]);

  return (
    <html
      lang="zh-CN"
      className={`${inter.className} ${ibmPlexMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="h-full bg-background text-foreground"
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          mainColor={mainColor}
          disableTransitionOnChange
        >
          <MenuProvider menus={menus}>
            <ResponsiveFontScale scaleFactor={0.017} baseSize={12}>
              <LoadingAnimation siteName={siteName} />
              <LayoutContainer>
                <Header menus={menus} />
                <MainContent>
                  <PageTransition>{children}</PageTransition>
                  <FooterMobileWrapper />
                </MainContent>
              </LayoutContainer>
              <FooterDesktopWrapper
                menus={menus}
                mainColor={mainColor.primary}
              />
            </ResponsiveFontScale>
          </MenuProvider>
        </ThemeProvider>
        {enableAnalytics && <AnalyticsTracker />}
      </body>
      <TokenManager />
    </html>
  );
}
