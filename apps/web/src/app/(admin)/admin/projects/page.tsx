import ProjectsHistoryChart from "@/app/(admin)/admin/projects/ProjectsHistoryChart";
import ProjectsReport from "@/app/(admin)/admin/projects/ProjectsReport";
import ProjectsTable from "@/app/(admin)/admin/projects/ProjectsTable";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/项目管理",
    description: "查看和管理项目",
  },
  {
    pathname: "/admin/projects",
  },
);

export default async function AdminProjects() {
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
          <ProjectsReport />
          <ProjectsHistoryChart />
        </RowGrid>
        <RowGrid>
          <ProjectsTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
