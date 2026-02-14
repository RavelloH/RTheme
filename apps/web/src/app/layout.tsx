// Main Layout
import "server-only";

import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
// Fonts
import { Inter } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";

import NotificationProvider from "@/components/client/features/notice/NotificationProvider";
import { LayoutContainer } from "@/components/client/layout/LayoutContainer";
import { LoadingAnimation } from "@/components/client/layout/LoadingAnimation";
import { MainContent } from "@/components/client/layout/MainContent";
import { MenuProvider } from "@/components/client/layout/MenuProvider";
import PageTransition from "@/components/client/layout/PageTransition";
import ResponsiveFontScale from "@/components/client/layout/ResponsiveFontScale";
// Client Components
import { ThemeProvider } from "@/components/client/layout/ThemeProvider";
import { AnalyticsTracker } from "@/components/client/logic/AnalyticsTracker";
import TokenManager from "@/components/client/logic/TokenManager";
import Footer from "@/components/server/layout/Footer";
// Server Componments
import Header from "@/components/server/layout/Header";
import { ConfigProvider } from "@/context/ConfigContext";
import { getConfigs } from "@/lib/server/config-cache";
// lib
import { getActiveMenusForClient } from "@/lib/server/menu-cache";
// Types
import { ToastProvider } from "@/ui/Toast";

// Styles
import "@/app/globals.css";

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
  cacheTag(
    "menus",
    "config/site.color",
    "config/site.title",
    "config/site.slogan.secondary",
    "config/site.avatar",
    "config/site.custom.script",
    "config/site.birthday",
    "config/site.copyright",
    "config/author.name",
    "config/analytics.enable",
    "config/notice.ably.key",
    "config/site.shiki.theme",
  );
  cacheLife("max");

  // 获取所有需要的配置
  const [
    menus,
    [
      mainColor,
      siteName,
      siteSloganSecondary,
      siteAvatar,
      customScriptConfig,
      siteBirthday,
      siteCopyright,
      siteAuthor,
      enableAnalytics,
      ablyEnabled,
      shikiTheme,
    ],
  ] = await Promise.all([
    getActiveMenusForClient(),
    getConfigs([
      "site.color",
      "site.title",
      "site.slogan.secondary",
      "site.avatar",
      "site.custom.script",
      "site.birthday",
      "site.copyright",
      "author.name",
      "analytics.enable",
      "notice.ably.key",
      "site.shiki.theme",
    ]),
  ]);

  const customScript =
    typeof customScriptConfig === "string" ? customScriptConfig.trim() : "";

  // 打包配置
  const configs = {
    "site.color": mainColor,
    "site.title": siteName,
    "site.slogan.secondary": siteSloganSecondary,
    "site.avatar": siteAvatar,
    "site.custom.script": customScript,
    "site.birthday": siteBirthday,
    "site.copyright": siteCopyright,
    "author.name": siteAuthor,
    "site.shiki.theme": shikiTheme,
    "analytics.enable": enableAnalytics,
    "notice.ably.key": ablyEnabled,
  };

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
            <ConfigProvider configs={configs}>
              <NotificationProvider>
                <MenuProvider menus={menus}>
                  <ResponsiveFontScale scaleFactor={0.017} baseSize={0}>
                    <LoadingAnimation mainColor={mainColor} />
                    <LayoutContainer>
                      <Suspense>
                        <Header
                          menus={menus}
                          slogan={siteSloganSecondary}
                          title={siteName}
                          copyright={siteCopyright}
                          author={siteAuthor}
                          birthday={siteBirthday}
                        />
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
                <Suspense fallback={null}>{modal}</Suspense>
              </NotificationProvider>
            </ConfigProvider>
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
        {customScript && (
          <div
            id="site-custom-script"
            dangerouslySetInnerHTML={{ __html: customScript }}
          />
        )}
      </body>
    </html>
  );
}
