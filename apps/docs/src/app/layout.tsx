import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { Inter } from "next/font/google";
import { ConfigProvider } from "@/components/config-form";

const inter = Inter({
  subsets: ["latin"],
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <ConfigProvider>{children}</ConfigProvider>
        </RootProvider>
      </body>
      <script
        defer
        src="https://analytics.ravelloh.top/script.js"
        data-website-id="3bdb8aab-a272-4cea-8193-63d8e03daac9"
      ></script>
    </html>
  );
}
