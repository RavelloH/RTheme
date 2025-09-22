import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { MainContent } from "@/components/MainContent";
import ResponsiveFontScale from "@/components/ResponsiveFontScale";
import { getMenus } from "@/lib/server/menuCache";

const inter = Inter({ subsets: ["latin"] });

async function getFooterMenus() {
  try {
    const menus = await getMenus();
    return menus.filter((menu) => menu.status === "ACTIVE");
  } catch (error) {
    console.error("Failed to get menus:", error);
    return [];
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const footerMenus = await getFooterMenus();

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
          <ResponsiveFontScale scaleFactor={0.017} baseSize={12}>
            <LoadingAnimation />
            <div className="min-h-full flex flex-col overflow-hidden">
              <Header />
              <MainContent>{children}</MainContent>
              <Footer menus={footerMenus} />
            </div>
          </ResponsiveFontScale>
        </ThemeProvider>
      </body>
    </html>
  );
}
