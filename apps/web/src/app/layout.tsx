import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { MainContent } from "@/components/MainContent";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
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
          <LoadingAnimation />
          <div className="min-h-full flex flex-col overflow-hidden">
            <Header />
            <MainContent>{children}</MainContent>
            <Footer />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
