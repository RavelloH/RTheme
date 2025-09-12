import { generateMetadata } from "@/lib/shared/seo";
import "./globals.css";

export const metadata = await generateMetadata({
  title: "首页",
  description: "欢迎访问我们的网站",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
