import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ConfigProvider } from "@/components/ConfigProvider";
import "./globals.css";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { MainContent } from "@/components/MainContent";
import ResponsiveFontScale from "@/components/ResponsiveFontScale";
import { getActiveMenus } from "@/lib/server/menuCache";
import { getAllConfigs } from "@/lib/server/configCache";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [menus, configs] = await Promise.all([
    getActiveMenus(),
    getAllConfigs(),
  ]);

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
          <ConfigProvider configs={configs}>
            <ResponsiveFontScale scaleFactor={0.017} baseSize={12}>
              <LoadingAnimation />
              <div className="min-h-full flex flex-col overflow-hidden">
                <Header menus={menus} />
                <MainContent>{children}</MainContent>
                <Footer menus={menus} />
              </div>
            </ResponsiveFontScale>
          </ConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
