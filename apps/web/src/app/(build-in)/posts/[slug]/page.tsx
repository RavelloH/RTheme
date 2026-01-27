import MainLayout from "@/components/MainLayout";
import { generateMetadata as generateSEOMetadata } from "@/lib/server/seo";
import {
  RiHashtag,
  RiListView,
  RiText,
  RiUserLine,
  RiCalendarLine,
  RiEye2Line,
  RiEditLine,
  RiInformationLine,
} from "@remixicon/react";
import CMSImage from "@/components/CMSImage";
import UniversalRenderer from "@/components/server/UniversalRenderer";
import PostToc from "@/components/PostToc";
import {
  getPublishedPost,
  renderPostContent,
  getAdjacentPosts,
} from "@/lib/server/post";
import { notFound } from "next/navigation";
import Link from "@/components/Link";
import {
  getCategoryNamePath,
  getCategoryPath,
} from "@/lib/server/category-utils";
import {
  batchQueryMediaFiles,
  processImageUrl,
  extractInternalHashes,
} from "@/lib/shared/image-utils";
import ImageLightbox from "@/components/client/ImageLightbox";
import { getConfigs } from "@/lib/server/config-cache";
import React from "react";
import CommentsSection from "@/components/client/CommentsSection";
import AdjacentPostCard from "@/components/AdjacentPostCard";
import ViewCountBatchLoader from "@/components/client/ViewCountBatchLoader";
import CommentCount from "@/components/client/CommentCount";
import { getFeaturedImageUrl } from "@/lib/server/media-reference";
import prisma from "@/lib/server/prisma";
import { cacheLife, cacheTag } from "next/cache";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 生成静态参数
export async function generateStaticParams() {
  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      slug: true,
    },
  });

  return posts.map((post) => ({
    slug: post.slug,
  }));
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
  "use cache";
  const { slug } = await params;

  let post,
    renderedContent,
    categoryPath,
    categorySlugPath,
    postMediaFileMap,
    adjacentPosts,
    previousFeaturedImage,
    nextFeaturedImage;
  const [
    commentEnabled,
    placeholder,
    anonymousEnabled,
    anonymousEmailRequired,
    anonymousWebsiteEnabled,
    reviewAll,
    reviewAnonymous,
    locateEnabled,
    siteURL,
    shikiTheme,
  ] = await getConfigs([
    "comment.enable",
    "comment.placeholder",
    "comment.anonymous.enable",
    "comment.anonymous.email.required",
    "comment.anonymous.website.enable",
    "comment.review.enable",
    "comment.anonymous.review.enable",
    "comment.locate.enable",
    "site.url",
    "site.shiki.theme",
  ]);

  try {
    // 获取文章数据和相邻文章
    [post, adjacentPosts] = await Promise.all([
      getPublishedPost(slug),
      getAdjacentPosts(slug),
    ]);

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

    // 查询文章特色图片的媒体文件信息
    postMediaFileMap = new Map();
    const allImageUrls = new Set<string>();

    if (post.featuredImage) {
      allImageUrls.add(post.featuredImage);
    }

    // 添加相邻文章的封面图片
    previousFeaturedImage = getFeaturedImageUrl(
      adjacentPosts.previous?.mediaRefs,
    );
    nextFeaturedImage = getFeaturedImageUrl(adjacentPosts.next?.mediaRefs);

    if (previousFeaturedImage) {
      allImageUrls.add(previousFeaturedImage);
    }
    if (nextFeaturedImage) {
      allImageUrls.add(nextFeaturedImage);
    }

    // 查询文章内容中的所有图片
    const contentImageHashes = extractInternalHashes(post.content);
    contentImageHashes.forEach((hash) => {
      allImageUrls.add(`/p/${hash.fullHash}`);
    });

    // 批量查询所有图片媒体信息
    postMediaFileMap = await batchQueryMediaFiles(Array.from(allImageUrls));
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

  cacheTag(
    `posts/${(await params).slug}`,
    `posts/${adjacentPosts.previous?.slug || "none"}`,
    `posts/${adjacentPosts.next?.slug || "none"}`,
    `users/${post.author.uid}`,
  );
  cacheLife("max");

  return (
    <MainLayout type="vertical" nopadding>
      {/* 批量加载访问量 */}
      <ViewCountBatchLoader />

      <ImageLightbox />
      <div className="h-full w-full">
        {/* 文章头部信息 */}
        <div className="py-10 px-6 md:px-10 text-xl flex flex-wrap gap-2 bg-primary text-primary-foreground">
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
                  <span key={categoryName}>
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
          <>
            <span className="opacity-0 transition-all" data-viewcount-separator>
              /
            </span>
            <span
              className="flex items-center gap-1 opacity-0 transition-all"
              data-viewcount-slug={slug}
            >
              <RiEye2Line size={"1em"} />
              <span>---</span>
            </span>
          </>
          <CommentCount />
        </div>

        {/* 文章标题和元信息 - 封面图作为背景，上方留空显示封面 */}
        <div className={`relative ${post.featuredImage ? "pt-[25em]" : ""}`}>
          {post.featuredImage && (
            <div className="absolute inset-0 z-0">
              {(() => {
                const processedImages = processImageUrl(
                  post.featuredImage,
                  postMediaFileMap,
                );
                const imageData = processedImages[0];
                return imageData ? (
                  <CMSImage
                    src={imageData.url}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    optimized={!!(imageData.width && imageData.height)}
                    width={imageData.width}
                    height={imageData.height}
                    blur={imageData.blur}
                    priority
                  />
                ) : (
                  <CMSImage
                    src={post.featuredImage}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="100vw"
                    priority
                  />
                );
              })()}
              {/* 渐变遮罩，确保文字可读性 */}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />
            </div>
          )}

          {/* 文章标题和标签内容 */}
          <div
            className={`relative z-10 py-10 px-6 md:px-10 border-border border-b ${post.featuredImage ? "" : "pt-12"}`}
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
        <div className="px-6 md:px-10 max-w-7xl mx-auto pt-10 flex gap-6 relative h-full">
          <div className="flex-[8] h-full min-w-0">
            <UniversalRenderer
              source={renderedContent.content}
              mode={renderedContent.mode}
              mediaFileMap={postMediaFileMap}
              skipFirstH1
              shikiTheme={shikiTheme} // ✅ 传递 Shiki 主题配置
            />
            {/* 文章底部信息 */}
            <div className="max-w-7xl mx-auto mt-12 border-t-2 py-8 border-border">
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex flex-wrap gap-4 ">
                  <span className="flex gap-1 items-center">
                    <RiCalendarLine size={"1em"} />
                    {formatDate(post.publishedAt!)}
                  </span>
                  <span>{"/"}</span>
                  <span className="flex gap-1 items-center">
                    <RiEditLine size="1em" />
                    {formatDate(post.updatedAt)}
                  </span>
                  <span>{"/"}</span>
                  <span>{post.title}</span>
                </div>
                <div className="flex flex-wrap gap-4 ">
                  <span className="flex gap-1 items-center">
                    <RiUserLine size={"1em"} />
                    {post.author.nickname
                      ? `${post.author.nickname} (@${post.author.username})`
                      : `@${post.author.username}`}
                  </span>
                  <span>{"/"}</span>
                  <span>{siteURL + "/posts/" + slug}</span>
                </div>
                <div className="flex flex-wrap gap-1 items-center">
                  <RiInformationLine size="1em" />
                  原创内容使用
                  <span className="px-1">
                    知识共享 署名-非商业性使用-相同方式共享 4.0 (CC BY-NC-ND
                    4.0)
                  </span>
                  协议授权。转载请注明出处。
                </div>
              </div>
            </div>
            {/* 上一篇和下一篇文章 */}
            {(adjacentPosts.previous || adjacentPosts.next) && (
              <div className="max-w-7xl mx-auto pt-16">
                <h2 className="text-2xl font-bold mb-6">继续阅读</h2>
                <div className="relative border-y border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    {adjacentPosts.previous ? (
                      <div className="border-b md:border-b-0 border-border/50 md:border-r md:border-border/0 relative">
                        <AdjacentPostCard
                          title={adjacentPosts.previous.title}
                          slug={adjacentPosts.previous.slug}
                          date={
                            adjacentPosts.previous.publishedAt?.toISOString() ||
                            ""
                          }
                          category={adjacentPosts.previous.categories}
                          tags={adjacentPosts.previous.tags}
                          cover={
                            previousFeaturedImage
                              ? processImageUrl(
                                  previousFeaturedImage,
                                  postMediaFileMap,
                                )
                              : undefined
                          }
                          direction="previous"
                        />
                      </div>
                    ) : (
                      // 占位符，保持布局平衡（如果只要一个显示50%的话，否则可以移除）
                      <div className="hidden md:block" />
                    )}

                    {adjacentPosts.next && (
                      <div className="relative">
                        <AdjacentPostCard
                          title={adjacentPosts.next.title}
                          slug={adjacentPosts.next.slug}
                          date={
                            adjacentPosts.next.publishedAt?.toISOString() || ""
                          }
                          category={adjacentPosts.next.categories}
                          tags={adjacentPosts.next.tags}
                          cover={
                            nextFeaturedImage
                              ? processImageUrl(
                                  nextFeaturedImage,
                                  postMediaFileMap,
                                )
                              : undefined
                          }
                          direction="next"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* 评论区 */}{" "}
            {commentEnabled && (
              <CommentsSection
                slug={post.slug}
                allowComments={post.allowComments}
                authorUid={post.author.uid}
                commentConfig={{
                  placeholder,
                  anonymousEnabled,
                  anonymousEmailRequired,
                  anonymousWebsiteEnabled,
                  reviewAll,
                  reviewAnonymous,
                  locateEnabled,
                }}
              />
            )}
          </div>
          {/* 侧边栏容器 */}
          <div className="flex-[2] hidden lg:block max-w-screen h-full sticky top-10 self-start">
            {/* 目录（包含视口内容卡片） */}
            <PostToc />
          </div>

          {/* 移动端目录按钮 */}
          <div className="lg:hidden fixed bottom-6 right-6 z-40">
            <PostToc isMobile={true} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
