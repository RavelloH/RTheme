import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import SystemOverview from "./SystemOverview";
import SystemMemoryChart from "./SystemMemoryChart";
import SystemCpuInfo from "./SystemCpuInfo";
import SystemDiskChart from "./SystemDiskChart";
import SystemProcessInfo from "./SystemProcessInfo";
import SystemNetworkInfo from "./SystemNetworkInfo";

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
