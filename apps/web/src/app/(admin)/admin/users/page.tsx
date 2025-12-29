import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import UsersReport from "./UsersReport";
import UsersHistoryChart from "./UsersHistoryChart";
import UsersTable from "./UsersTable";
import { getConfig } from "@/lib/server/config-cache";

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
          <UsersReport />
          <UsersHistoryChart />
        </RowGrid>
        <RowGrid>
          <UsersTable mainColor={mainColor} />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
