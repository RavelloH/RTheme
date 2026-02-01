import DoctorHistoryChart from "@/app/(admin)/admin/doctor/DoctorHistoryChart";
import DoctorHistoryTable from "@/app/(admin)/admin/doctor/DoctorHistoryTable";
import DoctorReport from "@/app/(admin)/admin/doctor/DoctorReport";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/运行状况检查",
    description: "查看近期站点的自检记录",
  },
  {
    pathname: "/admin/doctor",
  },
);

export default function AdminDashboard() {
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
          <DoctorReport />
          <DoctorHistoryChart />
        </RowGrid>
        <RowGrid>
          <DoctorHistoryTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
