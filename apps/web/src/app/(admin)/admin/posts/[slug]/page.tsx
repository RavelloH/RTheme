import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import { generateMetadata as generateSeoMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import Editor from "@/components/client/Editor/Editor";
import { getPostDetail } from "@/actions/post";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const { slug } = params;

  return generateSeoMetadata(
    {
      title: `管理面板/文章管理/编辑文章/${slug}`,
      description: `编辑文章：${slug}`,
    },
    {
      pathname: `/admin/posts/${slug}`,
    },
  );
}

export default async function EditPostPage(props: Props) {
  const params = await props.params;
  const { slug } = params;

  // 获取 access_token
  const cookieStore = await cookies();
  const access_token = cookieStore.get("access_token")?.value;

  // 获取文章详情
  const response = await getPostDetail({ access_token, slug });

  if (!response.success || !response.data) {
    notFound();
  }

  const post = response.data;

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
          <Editor
            content={post.content}
            storageKey={slug}
            isEditMode={true}
            initialData={{
              title: post.title,
              slug: post.slug,
              excerpt: post.excerpt || "",
              status: post.status,
              isPinned: post.isPinned,
              allowComments: post.allowComments,
              robotsIndex: post.robotsIndex,
              metaTitle: post.metaTitle || "",
              metaDescription: post.metaDescription || "",
              metaKeywords: post.metaKeywords || "",
              featuredImage: post.featuredImage || "",
              categories: post.categories,
              tags: post.tags,
              postMode: post.postMode,
            }}
          />
        </div>
      </HorizontalScroll>
    </MainLayout>
  );
}
