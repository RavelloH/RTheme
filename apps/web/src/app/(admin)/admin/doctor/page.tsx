import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import DoctorReport from "./DoctorReport";
import DoctorHistoryChart from "./DoctorHistoryChart";
import DoctorHistoryTable from "./DoctorHistoryTable";

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
