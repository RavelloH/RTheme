import CloudHistoryChart from "@/app/(admin)/admin/cloud/CloudHistoryChart";
import CloudHistoryTable from "@/app/(admin)/admin/cloud/CloudHistoryTable";
import CloudReport from "@/app/(admin)/admin/cloud/CloudReport";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/云端互联",
    description: "查看云端触发状态、同步实例配置与投递历史",
  },
  {
    pathname: "/admin/cloud",
  },
);

export default function AdminCloudPage() {
  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax
        enableFadeElements
        enableLineReveal
        snapToElements={false}
      >
        <AdminSidebar />
        <RowGrid>
          <CloudReport />
          <CloudHistoryChart />
        </RowGrid>
        <RowGrid>
          <CloudHistoryTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
