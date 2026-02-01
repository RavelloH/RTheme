import AuditHistoryChart from "@/app/(admin)/admin/audit-logs/AuditHistoryChart";
import AuditLogInfo from "@/app/(admin)/admin/audit-logs/AuditLogInfo";
import AuditLogTable from "@/app/(admin)/admin/audit-logs/AuditLogTable";
import AdminSidebar from "@/components/AdminSidebar";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/审计日志",
    description: "查看系统的操作审计日志和趋势",
  },
  {
    pathname: "/admin/audit-logs",
  },
);

export default async function AuditLogsPage() {
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
          <AuditLogInfo />
          <AuditHistoryChart />
        </RowGrid>
        <RowGrid>
          <AuditLogTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
