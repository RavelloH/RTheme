import CronHistoryChart from "@/app/(admin)/admin/cron/CronHistoryChart";
import CronHistoryTable from "@/app/(admin)/admin/cron/CronHistoryTable";
import CronReport from "@/app/(admin)/admin/cron/CronReport";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/计划任务",
    description: "手动触发并追踪计划任务执行历史",
  },
  {
    pathname: "/admin/cron",
  },
);

export default function AdminCronPage() {
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
          <CronReport />
          <CronHistoryChart />
        </RowGrid>
        <RowGrid>
          <CronHistoryTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
