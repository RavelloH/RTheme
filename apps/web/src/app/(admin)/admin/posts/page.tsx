import PostsHistoryChart from "@/app/(admin)/admin/posts/PostsHistoryChart";
import PostsReport from "@/app/(admin)/admin/posts/PostsReport";
import PostsTable from "@/app/(admin)/admin/posts/PostsTable";
import AdminSidebar from "@/components/AdminSidebar";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/文章管理",
    description: "查看和管理文章",
  },
  {
    pathname: "/admin/posts",
  },
);

export default async function AdminPosts() {
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
          <PostsReport />
          <PostsHistoryChart />
        </RowGrid>
        <RowGrid>
          <PostsTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
