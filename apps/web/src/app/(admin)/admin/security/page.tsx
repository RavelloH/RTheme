import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import SecurityOverview from "./SecurityOverview";
import MonthlyTrendsChart from "./MonthlyTrendsChart";
import RequestTrendsChart from "./RequestTrendsChart";
import IPTable from "./IPTable";
import EndpointStatsChart from "./EndpointStatsChart";

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
