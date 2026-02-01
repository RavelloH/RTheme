import UsersHistoryChart from "@/app/(admin)/admin/users/UsersHistoryChart";
import UsersReport from "@/app/(admin)/admin/users/UsersReport";
import UsersTable from "@/app/(admin)/admin/users/UsersTable";
import AdminSidebar from "@/components/AdminSidebar";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/用户管理",
    description: "查看和管理平台用户",
  },
  {
    pathname: "/admin/users",
  },
);

export default async function AdminUsers() {
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
          <UsersReport />
          <UsersHistoryChart />
        </RowGrid>
        <RowGrid>
          <UsersTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
