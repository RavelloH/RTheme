import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import MediaStats from "./MediaStats";
import MediaStatsChart from "./MediaStatsChart";
import MediaTable from "./MediaTable";

export const metadata = await generateMetadata(
  {
    title: "管理面板/媒体管理",
    description: "查看并管理页面上的媒体内容",
  },
  {
    pathname: "/admin/media",
  },
);

export default function MediaAdminPage() {
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
        <RowGrid>
          {/* 媒体内容统计 */}
          <MediaStats />
          {/* 媒体内容趋势统计图表 */}
          <MediaStatsChart />
        </RowGrid>
        <RowGrid>
          {/* 管理媒体内容表 */}
          <MediaTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
