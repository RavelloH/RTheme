import Editor from "@/components/client/features/editor/Editor";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import { generateMetadata } from "@/lib/server/seo";

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
        {/* // TODO: 实现类似Grid的平分效果 */}
        <div className="w-full overflow-y-auto">
          <Editor content="# 未命名文章" />
        </div>
      </HorizontalScroll>
    </MainLayout>
  );
}
