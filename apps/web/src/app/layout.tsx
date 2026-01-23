// Main Layout
import "server-only";

// Fonts
import { Inter } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";

// Styles
import "./globals.css";

// Server Componments
import Header from "@/components/server/Header";

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
import NotificationProvider from "@/components/NotificationProvider";

// lib
import { getActiveMenus } from "@/lib/server/menu-cache";
import { getConfig } from "@/lib/server/config-cache";

// Types
import { ColorConfig } from "@/types/config";
import { ToastProvider } from "@/ui/Toast";
import Footer from "@/components/server/Footer";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";

const inter = Inter({ subsets: ["latin"], display: "swap" });
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});

export default async function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  "use cache";
  cacheTag("config", "menus");
  cacheLife("max");
  const [menus, mainColor, siteName, enableAnalytics, ablyEnabled] =
    await Promise.all([
      getActiveMenus(),
      getConfig<ColorConfig>("site.color"),
      getConfig<string>("site.title"),
      getConfig<boolean>("analytics.enable"),
      getConfig<string>("notice.ably.key"),
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
        <ToastProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            mainColor={mainColor}
            disableTransitionOnChange
          >
            <NotificationProvider isAblyEnabled={ablyEnabled ? true : false}>
              <MenuProvider menus={menus}>
                <ResponsiveFontScale scaleFactor={0.017} baseSize={12}>
                  <LoadingAnimation siteName={siteName} />
                  <LayoutContainer>
                    <Suspense>
                      <Header menus={menus} />
                    </Suspense>
                    <MainContent>
                      <Suspense>
                        <PageTransition>{children}</PageTransition>
                      </Suspense>
                    </MainContent>
                  </LayoutContainer>
                  <Suspense>
                    <Footer menus={menus} />
                  </Suspense>
                </ResponsiveFontScale>
              </MenuProvider>
              {modal}
            </NotificationProvider>
          </ThemeProvider>
          {enableAnalytics && (
            <Suspense>
              <AnalyticsTracker />
            </Suspense>
          )}
          <Suspense>
            <TokenManager />
          </Suspense>
        </ToastProvider>
      </body>
    </html>
  );
}
