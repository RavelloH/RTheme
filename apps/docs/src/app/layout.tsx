import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { Inter } from "next/font/google";
import { ConfigProvider } from "@/components/config-form";
import type { Metadata } from "next";
import Script from "next/script";
import SearchDialog from "@/components/search-dialog";

export const metadata: Metadata = {
  title: {
    template: "%s | NeutralPress Docs",
    default: "NeutralPress Docs",
  },
  description: "基于 Next.js 构建的下一代动态 CMS 博客系统",
  icons: {
    icon: "/icon.png",
  },
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider
          search={{
            SearchDialog,
          }}
        >
          <ConfigProvider>{children}</ConfigProvider>
        </RootProvider>
      </body>
      <Script
        defer
        src="https://analytics.ravelloh.top/script.js"
        data-website-id="72199c18-30da-47fe-9988-2a3eef3446c0"
      ></Script>
    </html>
  );
}
