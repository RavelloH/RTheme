import MainLayout from "@/components/MainLayout";
import { generateMetadata as generateSEOMetadata } from "@/lib/server/seo";
import {
  RiHashtag,
  RiListView,
  RiMessageLine,
  RiText,
  RiUserLine,
  RiCalendarLine,
  RiEye2Line,
} from "@remixicon/react";
import Image from "next/image";
import MDXRenderer from "@/components/MDXRenderer";
import PostToc from "@/components/PostToc";
import { getPublishedPost, renderPostContent } from "@/lib/server/post";
import { notFound } from "next/navigation";
import Link from "@/components/Link";
import {
  getCategoryNamePath,
  getCategoryPath,
} from "@/lib/server/category-utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  try {
    const post = await getPublishedPost(slug);

    return await generateSEOMetadata(
      {
        title: post.title,
        description:
          post.excerpt || post.metaDescription || `阅读文章《${post.title}》`,
        keywords: post.metaKeywords,
      },
      {
        pathname: `/posts/${post.slug}`,
      },
    );
  } catch {
    return;
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;

  let post, renderedContent, categoryPath, categorySlugPath;

  try {
    // 获取文章数据
    post = await getPublishedPost(slug);

    // 获取所有分类的路径
    if (post.categories.length > 0) {
      const categoryPaths = await Promise.all(
        post.categories.map((category) => getCategoryNamePath(category.id)),
      );
      const categorySlugPaths = await Promise.all(
        post.categories.map((category) => getCategoryPath(category.id)),
      );
      categoryPath = categoryPaths[0]; // 使用第一个分类的名称路径
      categorySlugPath = categorySlugPaths[0]; // 使用第一个分类的 slug 路径
    }

    // 渲染文章内容
    renderedContent = await renderPostContent(post);
  } catch {
    // 如果文章不存在或未发布，返回 404
    notFound();
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 生成分类链接路径
  const generateCategoryLink = (slugArray: string[], index: number) => {
    const pathUpToIndex = slugArray.slice(0, index + 1).join("/");
    return `/categories/${pathUpToIndex}`;
  };

  return (
    <MainLayout type="vertical" nopadding>
      <div className="h-full w-full">
        {/* 文章头部信息 */}
        <div className="p-10 text-xl flex flex-wrap gap-2 bg-primary text-primary-foreground">
          <span className="flex items-center gap-1">
            <RiCalendarLine size={"1em"} />
            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
          </span>
          <span>/</span>
          <span className="flex items-center gap-1">
            <RiUserLine size={"1em"} />
            <Link
              href={"/user/" + post.author.uid}
              presets={["hover-underline"]}
            >
              {post.author.nickname || post.author.username}
            </Link>
          </span>
          {categoryPath && categoryPath.length > 0 && categorySlugPath && (
            <>
              <span>/</span>
              <span className="flex items-center gap-1">
                <RiListView size={"1em"} />
                {categoryPath.map((categoryName, index) => (
                  <span key={index}>
                    <Link
                      href={generateCategoryLink(categorySlugPath, index)}
                      presets={["hover-underline"]}
                    >
                      {categoryName}
                    </Link>
                    {index < categoryPath.length - 1 && " > "}
                  </span>
                ))}
              </span>
            </>
          )}
          <span>/</span>
          <span className="flex items-center gap-1">
            <RiText size={"1em"} />
            <span>{post.content.length}字</span>
          </span>
          <span>/</span>
          <span className="flex items-center gap-1">
            <RiEye2Line size={"1em"} />
            <span>{post._count.comments}</span>
          </span>
          <span>/</span>
          <span className="flex items-center gap-1">
            <RiMessageLine size={"1em"} />
            <span>{post._count.comments}</span>
          </span>
        </div>

        {/* 文章标题和元信息 - 封面图作为背景，上方留空显示封面 */}
        <div className={`relative ${post.featuredImage ? "pt-[25em]" : ""}`}>
          {post.featuredImage && (
            <div className="absolute inset-0 z-0">
              <Image
                src={post.featuredImage}
                alt={post.title}
                loading="eager"
                fill
                className="object-cover"
                priority
              />
              {/* 渐变遮罩，确保文字可读性 */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
            </div>
          )}

          {/* 文章标题和标签内容 */}
          <div
            className={`relative z-10 p-10 border-border border-b ${post.featuredImage ? "" : "pt-12"}`}
          >
            <h1 className="text-5xl md:text-7xl mb-2">{post.title}</h1>
            <div className="text-xl md:text-2xl font-mono pt-3 text-muted-foreground">
              #{post.slug}
            </div>

            {/* 标签 */}
            {post.tags.length > 0 ? (
              <div className="text-lg pt-3 mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.slug}
                    href={"/tags/" + tag.slug}
                    className="bg-muted text-muted-foreground transition-all px-3 py-2 rounded-sm inline-flex gap-1 items-center hover:bg-muted/70 hover:text-foreground"
                  >
                    <RiHashtag size={"1em"} />
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : post.featuredImage ? (
              // 只在有背景图时创建占位，保持布局稳定
              <div className="text-lg pt-3 mt-4 flex flex-wrap gap-2 invisible">
                <span className="bg-muted text-muted-foreground px-3 py-2 rounded-sm inline-flex gap-1 items-center">
                  <RiHashtag size={"1em"} />
                  占位标签
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* 摘要 */}
        {post.excerpt && (
          <div className="flex">
            <div className="text-lg p-10 border border-border flex-[7]">
              <h2 className="text-2xl font-bold mb-4">文章摘要</h2>
              <p className="leading-relaxed">{post.excerpt}</p>
            </div>
            <div className="flex-[3] border border-border flex items-center justify-center bg-muted/20">
              <div className="text-center p-6">
                <RiText size={"2em"} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">摘要 / Summary</p>
              </div>
            </div>
          </div>
        )}

        {/* 文章内容 */}
        <div className="px-10 max-w-7xl mx-auto pt-10 flex gap-6 relative">
          <div className="flex-[8]">
            <MDXRenderer
              source={renderedContent.content}
              mode={renderedContent.mode}
            />
          </div>
          <div className="flex-[2] hidden lg:block max-w-screen">
            <PostToc />
          </div>

          {/* 移动端目录按钮 */}
          <div className="lg:hidden fixed bottom-6 right-6 z-40">
            <PostToc isMobile={true} />
          </div>
        </div>

        {/* 文章底部信息 */}
        <div className="px-10 max-w-7xl mx-auto mt-12 pb-10 border-t pt-8">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>发布于: {formatDate(post.publishedAt!)}</span>
            <span>创建于: {formatDate(post.createdAt)}</span>
            <span>最后更新: {formatDate(post.updatedAt)}</span>
            {post.allowComments && (
              <span className="text-green-600 dark:text-green-400">
                允许评论
              </span>
            )}
            {post.isPinned && (
              <span className="text-orange-600 dark:text-orange-400">
                置顶文章
              </span>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
