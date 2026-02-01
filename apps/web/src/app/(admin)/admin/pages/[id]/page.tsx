import LayoutEditorClientWrapper from "@/app/(admin)/admin/pages/[id]/client";
import AdminSidebar from "@/components/AdminSidebar";
import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import { resolveBlockData } from "@/lib/server/block-data-resolver";
import { getRawPageById, getSystemPageConfig } from "@/lib/server/page-cache";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/页面管理/编辑页面",
    description: "编辑页面布局和内容",
  },
  {
    pathname: "/admin/pages/[id]",
  },
);

export default async function LayoutEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Server-side data fetching
  const page = await getRawPageById(id);

  if (!page) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        页面未找到: {id}
      </div>
    );
  }

  // 解析 Block 数据，实现编辑器中的"所见即所得"
  const config = getSystemPageConfig(page);
  const resolvedConfig = config
    ? await resolveBlockData(config as Parameters<typeof resolveBlockData>[0])
    : config;
  const resolvedPage = {
    ...page,
    config: (resolvedConfig || config) as typeof page.config,
  };

  return (
    <MainLayout type="horizontal">
      <HorizontalScroll className="h-full">
        <AdminSidebar />
        <div className="w-full overflow-y-auto">
          <LayoutEditorClientWrapper page={resolvedPage} />
        </div>
      </HorizontalScroll>
    </MainLayout>
  );
}
