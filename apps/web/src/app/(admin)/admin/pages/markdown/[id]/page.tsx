import { redirect } from "next/navigation";

import {
  getPageByIdParam,
  resolveContentTypeEditorPath,
} from "@/app/(admin)/admin/pages/page-editor";
import PageTextEditorClient from "@/app/(admin)/admin/pages/PageTextEditorClient";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import { generateMetadata as generateSeoMetadata } from "@/lib/server/seo";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(props: Props) {
  const { id } = await props.params;

  return generateSeoMetadata(
    {
      title: `管理面板/页面管理/Markdown编辑器/${id}`,
      description: `编辑页面内容（Markdown）：${id}`,
    },
    {
      pathname: `/admin/pages/markdown/${id}`,
    },
  );
}

export default async function MarkdownPageEditorPage({ params }: Props) {
  const { id } = await params;
  const page = await getPageByIdParam(id);

  if (!page) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        页面未找到: {id}
      </div>
    );
  }

  if (page.contentType !== "MARKDOWN") {
    redirect(resolveContentTypeEditorPath(page));
  }

  return (
    <MainLayout type="horizontal">
      <HorizontalScroll className="h-full">
        <AdminSidebar />
        <div className="w-full overflow-y-auto">
          <PageTextEditorClient
            page={{
              id: page.id,
              title: page.title,
              slug: page.slug,
              content: page.content,
              contentType: page.contentType,
            }}
          />
        </div>
      </HorizontalScroll>
    </MainLayout>
  );
}
