import MainLayout from "@/components/MainLayout";
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
    <MainLayout type="vertical">
      <div className="flex h-full w-full">
        <div className="flex-1 overflow-y-auto p-6 break-after-all text-secondary-foreground">
          {"a b c ".repeat(10000)}
        </div>
      </div>
    </MainLayout>
  );
}
