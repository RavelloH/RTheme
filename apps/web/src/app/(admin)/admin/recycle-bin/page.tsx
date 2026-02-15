import RecycleBinDistributionChart from "@/app/(admin)/admin/recycle-bin/RecycleBinDistributionChart";
import RecycleBinReport from "@/app/(admin)/admin/recycle-bin/RecycleBinReport";
import RecycleBinTable from "@/app/(admin)/admin/recycle-bin/RecycleBinTable";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/回收站",
    description: "统一管理已软删除的资源，支持还原与彻底删除",
  },
  {
    pathname: "/admin/recycle-bin",
  },
);

export default function AdminRecycleBinPage() {
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
          <RecycleBinReport />
          <RecycleBinDistributionChart />
        </RowGrid>
        <RowGrid>
          <RecycleBinTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
