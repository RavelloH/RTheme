import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import DashboardDoctor from "./DashboardDoctor";
import AdminSidebar from "@/components/AdminSidebar";
import DashboardUsersStats from "./DashboardUsersStats";
import DashboardAuditStats from "./DashboardAuditStats";
import DashboardPostsStats from "./DashboardPostsStats";
import DashboardTagsStats from "./DashboardTagsStats";
import DashboardCategoriesStats from "./DashboardCategoriesStats";
import DashboardPagesStats from "./DashboardPagesStats";
import DashboardMediaStats from "./DashboardMediaStats";

export const metadata = await generateMetadata(
  {
    title: "管理面板/仪表盘",
    description: "快速查看站点当前状态",
  },
  {
    pathname: "/admin/dashboard",
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
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardDoctor />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardPostsStats />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <div className="flex items-center justify-center h-full">
              访问统计图表
            </div>
          </GridItem>
        </RowGrid>
        <RowGrid>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardUsersStats />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <div className="flex items-center justify-center h-full">
              评论信息图表
            </div>
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardMediaStats />
          </GridItem>
        </RowGrid>
        <RowGrid>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardTagsStats />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardCategoriesStats />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <div className="flex items-center justify-center h-full">
              作品信息图表
            </div>
          </GridItem>
        </RowGrid>
        <RowGrid>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardPagesStats />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <div className="flex items-center justify-center h-full">
              安全信息统计
            </div>
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardAuditStats />
          </GridItem>
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
