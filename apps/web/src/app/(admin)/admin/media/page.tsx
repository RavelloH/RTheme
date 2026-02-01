import { Suspense } from "react";

import MediaAdd from "@/app/(admin)/admin/media/MediaAdd";
import MediaImport from "@/app/(admin)/admin/media/MediaImport";
import MediaStats from "@/app/(admin)/admin/media/MediaStats";
import MediaStatsChart from "@/app/(admin)/admin/media/MediaStatsChart";
import MediaTable from "@/app/(admin)/admin/media/MediaTable";
import AdminSidebar from "@/components/AdminSidebar";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

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
          <Suspense fallback={null}>
            <MediaImport />
            <MediaAdd />
          </Suspense>
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
