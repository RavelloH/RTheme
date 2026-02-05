import DashboardAuditStats from "@/app/(admin)/admin/dashboard/DashboardAuditStats";
import DashboardCategoriesStats from "@/app/(admin)/admin/dashboard/DashboardCategoriesStats";
import DashboardCommentsStats from "@/app/(admin)/admin/dashboard/DashboardCommentsStats";
import DashboardDoctor from "@/app/(admin)/admin/dashboard/DashboardDoctor";
import DashboardMediaStats from "@/app/(admin)/admin/dashboard/DashboardMediaStats";
import DashboardPagesStats from "@/app/(admin)/admin/dashboard/DashboardPagesStats";
import DashboardPostsStats from "@/app/(admin)/admin/dashboard/DashboardPostsStats";
import DashboardProjectsStats from "@/app/(admin)/admin/dashboard/DashboardProjectsStats";
import DashboardSearchIndexStats from "@/app/(admin)/admin/dashboard/DashboardSearchIndexStats";
import DashboardSearchInsightStats from "@/app/(admin)/admin/dashboard/DashboardSearchInsightStats";
import DashboardSecurityStats from "@/app/(admin)/admin/dashboard/DashboardSecurityStats";
import DashboardTagsStats from "@/app/(admin)/admin/dashboard/DashboardTagsStats";
import DashboardUsersStats from "@/app/(admin)/admin/dashboard/DashboardUsersStats";
import DashboardVisitStats from "@/app/(admin)/admin/dashboard/DashboardVisitStats";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

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
            <DashboardVisitStats />
          </GridItem>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardUsersStats />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardCommentsStats />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardMediaStats />
          </GridItem>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardTagsStats />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardCategoriesStats />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardProjectsStats />
          </GridItem>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <div className="flex items-center justify-center h-full">
              友情链接图表
            </div>
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardSearchInsightStats />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardSearchIndexStats />
          </GridItem>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardPagesStats />
          </GridItem>
          <GridItem areas={[5, 6, 7, 8]} width={3} height={0.5}>
            <DashboardSecurityStats />
          </GridItem>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5}>
            <DashboardAuditStats />
          </GridItem>
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
