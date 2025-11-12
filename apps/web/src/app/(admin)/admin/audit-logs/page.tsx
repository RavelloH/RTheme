import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import AuditHistoryChart from "./AuditHistoryChart";
import AuditLogTable from "./AuditLogTable";
import AuditLogInfo from "./AuditLogInfo";
import { getConfig } from "@/lib/server/configCache";

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
  const mainColor = (await getConfig<{ primary: string }>("site.color"))
    .primary;
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
          <AuditHistoryChart mainColor={mainColor} />
        </RowGrid>
        <RowGrid>
          <AuditLogTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
