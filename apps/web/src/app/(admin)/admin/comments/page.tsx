import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import CommentsReport from "./CommentsReport";
import CommentsHistoryChart from "./CommentsHistoryChart";
import CommentsTable from "./CommentsTable";

export const metadata = await generateMetadata(
  {
    title: "管理面板/评论管理",
    description: "查看和管理评论",
  },
  {
    pathname: "/admin/comments",
  },
);

export default async function AdminComments() {
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
          <CommentsReport />
          <CommentsHistoryChart />
        </RowGrid>
        <RowGrid>
          <CommentsTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
