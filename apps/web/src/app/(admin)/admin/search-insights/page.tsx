import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import SearchInsightReport from "./SearchInsightReport";
import SearchTrendChart from "./SearchTrendChart";
import SearchPerformanceChart from "./SearchPerformanceChart";
import SearchWordCloud from "./SearchWordCloud";
import SearchLogsTable from "./SearchLogsTable";

export const metadata = await generateMetadata(
  {
    title: "管理面板/搜索洞察",
    description: "查看站点的搜索效果",
  },
  {
    pathname: "/admin/search-insights",
  },
);

export default async function AdminSearchInsight() {
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
          {/* 搜索报告 */}
          <SearchInsightReport />
          {/* 搜索趋势图 */}
          <SearchTrendChart />
          {/* 搜索性能图 */}
          <SearchPerformanceChart />
        </RowGrid>
        <RowGrid>
          {/* 搜索词云 */}
          <SearchWordCloud />
        </RowGrid>
        <RowGrid>
          {/* 搜索日志表格 */}
          <SearchLogsTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
