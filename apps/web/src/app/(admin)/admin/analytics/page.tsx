import AnalyticsStats from "@/app/(admin)/admin/analytics/AnalyticsStats";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import { generateMetadata } from "@/lib/server/seo";

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
        <AnalyticsStats />
      </HorizontalScroll>
    </MainLayout>
  );
}
