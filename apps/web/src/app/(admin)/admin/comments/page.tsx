import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import CommentsReport from "./CommentsReport";
import CommentsHistoryChart from "./CommentsHistoryChart";
import CommentsTable from "./CommentsTable";
import { ToastProvider } from "@/ui/Toast";
import { getConfig } from "@/lib/server/config-cache";

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
  const mainColor = (await getConfig<{ primary: string }>("site.color"))
    .primary;
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
          <CommentsHistoryChart mainColor={mainColor} />
        </RowGrid>
        <RowGrid>
          <ToastProvider>
            <CommentsTable />
          </ToastProvider>
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
