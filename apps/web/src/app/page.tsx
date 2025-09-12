import { generateMetadata } from "@/lib/shared/seo";

export const metadata = await generateMetadata(
  {
    title: "首页",
    description: "欢迎访问我们的网站",
  },
  {
    pathname: "/",
  }
);

export default function Home() {
  return <>Running</>;
}
