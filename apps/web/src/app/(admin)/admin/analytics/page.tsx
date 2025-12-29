import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import AdminSidebar from "@/components/AdminSidebar";
import { generateMetadata } from "@/lib/server/seo";
import AnalyticsStats from "./AnalyticsStats";
import { getConfig } from "@/lib/server/config-cache";

export const metadata = await generateMetadata(
  {
    title: "管理面板/访问分析",
    description: "查看网站访问分析数据和分析报告",
  },
  {
    pathname: "/admin/analytics",
  },
);

export default async function AnalyticsPage() {
  const mainColor = (await getConfig<{ primary: string }>("site.color"))
    .primary;
  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax={true}
        enableFadeElements={true}
        enableLineReveal={true}
        snapToElements={false}
      >
        <AdminSidebar />
        <AnalyticsStats mainColor={mainColor} />
      </HorizontalScroll>
    </MainLayout>
  );
}
