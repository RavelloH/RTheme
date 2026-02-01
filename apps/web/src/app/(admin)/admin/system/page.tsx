import SystemCpuInfo from "@/app/(admin)/admin/system/SystemCpuInfo";
import SystemDiskChart from "@/app/(admin)/admin/system/SystemDiskChart";
import SystemMemoryChart from "@/app/(admin)/admin/system/SystemMemoryChart";
import SystemNetworkInfo from "@/app/(admin)/admin/system/SystemNetworkInfo";
import SystemOverview from "@/app/(admin)/admin/system/SystemOverview";
import SystemProcessInfo from "@/app/(admin)/admin/system/SystemProcessInfo";
import AdminSidebar from "@/components/AdminSidebar";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/系统信息",
    description: "查看服务器系统运行状态和资源使用情况",
  },
  {
    pathname: "/admin/system",
  },
);

export default function SystemInfoPage() {
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
          <SystemOverview />
        </RowGrid>
        <RowGrid>
          <SystemMemoryChart />
          <SystemCpuInfo />
          <SystemDiskChart />
          <SystemProcessInfo />
          <SystemNetworkInfo />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
