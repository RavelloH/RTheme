import FriendsHistoryChart from "@/app/(admin)/admin/friends/FriendsHistoryChart";
import FriendsReport from "@/app/(admin)/admin/friends/FriendsReport";
import FriendsTable from "@/app/(admin)/admin/friends/FriendsTable";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/友情链接",
    description: "管理友情链接申请、审核与健康检查",
  },
  {
    pathname: "/admin/friends",
  },
);

export default function AdminFriendsPage() {
  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax
        enableFadeElements
        enableLineReveal
        snapToElements={false}
      >
        <AdminSidebar />
        <RowGrid>
          <FriendsReport />
          <FriendsHistoryChart />
        </RowGrid>
        <RowGrid>
          <FriendsTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
