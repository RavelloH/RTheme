import EndpointStatsChart from "@/app/(admin)/admin/security/EndpointStatsChart";
import IPTable from "@/app/(admin)/admin/security/IPTable";
import MonthlyTrendsChart from "@/app/(admin)/admin/security/MonthlyTrendsChart";
import RequestTrendsChart from "@/app/(admin)/admin/security/RequestTrendsChart";
import SecurityOverview from "@/app/(admin)/admin/security/SecurityOverview";
import AdminSidebar from "@/components/AdminSidebar";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/安全中心",
    description: "查看和管理IP封禁、速率限制和API请求统计",
  },
  {
    pathname: "/admin/security",
  },
);

export default async function SecurityPage() {
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
          <SecurityOverview />
          <MonthlyTrendsChart />
          <RequestTrendsChart />
        </RowGrid>
        <RowGrid>
          <EndpointStatsChart />
        </RowGrid>
        <RowGrid>
          <IPTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
