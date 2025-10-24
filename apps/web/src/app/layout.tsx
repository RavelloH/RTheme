// Main Layout
import "server-only";

// Fonts
import { Inter } from "next/font/google";

// Styles
import "./globals.css";

// Server Componments
import Header from "@/components/server/Header";
import Footer from "@/components/server/Footer";

// Client Components
import { ThemeProvider } from "@/components/ThemeProvider";
import { MenuProvider } from "@/components/MenuProvider";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { MainContent } from "@/components/MainContent";
import ResponsiveFontScale from "@/components/ResponsiveFontScale";
import PageTransition from "@/components/PageTransition";
import TokenManager from "@/components/TokenManager";

// lib
import { getActiveMenus } from "@/lib/server/menuCache";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [menus] = await Promise.all([getActiveMenus()]);

  return (
    <html
      lang="zh-CN"
      className={`${inter.className} h-full`}
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
          disableTransitionOnChange
        >
          <MenuProvider menus={menus}>
            <ResponsiveFontScale scaleFactor={0.017} baseSize={12}>
              <LoadingAnimation />
              <div className="min-h-full flex flex-col overflow-hidden">
                <Header menus={menus} />
                <MainContent>
                  <PageTransition>{children}</PageTransition>
                </MainContent>
                <Footer menus={menus} />
              </div>
            </ResponsiveFontScale>
          </MenuProvider>
        </ThemeProvider>
      </body>
      <TokenManager />
    </html>
  );
}
