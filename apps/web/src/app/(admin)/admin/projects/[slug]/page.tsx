import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { getProjectDetail } from "@/actions/project";
import ProjectEditorWrapper from "@/app/(admin)/admin/projects/[slug]/ProjectEditorWrapper";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import { generateMetadata as generateSeoMetadata } from "@/lib/server/seo";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const { slug } = params;

  return generateSeoMetadata(
    {
      title: `管理面板/项目管理/编辑项目/${slug}`,
      description: `编辑项目：${slug}`,
    },
    {
      pathname: `/admin/projects/${slug}`,
    },
  );
}

export default async function EditProjectPage(props: Props) {
  const params = await props.params;
  const { slug } = params;

  // 获取 access_token
  const cookieStore = await cookies();
  const access_token = cookieStore.get("access_token")?.value;

  // 获取项目详情
  const response = await getProjectDetail({ access_token, slug });

  if (!response.success || !response.data) {
    notFound();
  }

  const project = response.data;

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
        <div className="w-full overflow-y-auto">
          <ProjectEditorWrapper project={project} access_token={access_token!} />
        </div>
      </HorizontalScroll>
    </MainLayout>
  );
}
