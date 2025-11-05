import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";

export const metadata = await generateMetadata(
  {
    title: "管理面板/文章管理/新建文章",
    description: "从零开始创建一篇文章",
  },
  {
    pathname: "/admin/posts/new",
  },
);

export default async function NewPostPage() {
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
      </HorizontalScroll>
    </MainLayout>
  );
}
