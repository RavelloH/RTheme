import CommentsSection from "@/components/client/features/posts/CommentsSection";
import PostToc from "@/components/client/features/posts/PostToc";
import MainLayout from "@/components/client/layout/MainLayout";
import UniversalRenderer from "@/components/server/renderer/UniversalRenderer";
import JsonLdScript from "@/components/server/seo/JsonLdScript";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { getConfigs } from "@/lib/server/config-cache";
import type { JsonLdGraph } from "@/lib/server/seo";

interface PageTextContentLayoutProps {
  pageId: string;
  slug: string;
  title: string;
  authorUid?: number | null;
  description?: string | null;
  source: string;
  mode: "markdown" | "mdx" | "html";
  allowComments: boolean;
  jsonLdGraph?: JsonLdGraph;
}

export default async function PageTextContentLayout({
  pageId,
  slug,
  title,
  authorUid,
  description,
  source,
  mode,
  allowComments,
  jsonLdGraph = [],
}: PageTextContentLayoutProps) {
  const [shikiTheme, commentEnabled] = await getConfigs([
    "site.shiki.theme",
    "comment.enable",
  ]);

  let commentConfig: {
    placeholder: string;
    anonymousEnabled: boolean;
    anonymousEmailRequired: boolean;
    anonymousWebsiteEnabled: boolean;
    reviewAll: boolean;
    reviewAnonymous: boolean;
    locateEnabled: boolean;
  } | null = null;

  if (commentEnabled && allowComments) {
    const [
      placeholder,
      anonymousEnabled,
      anonymousEmailRequired,
      anonymousWebsiteEnabled,
      reviewAll,
      reviewAnonymous,
      locateEnabled,
    ] = await getConfigs([
      "comment.placeholder",
      "comment.anonymous.enable",
      "comment.anonymous.email.required",
      "comment.anonymous.website.enable",
      "comment.review.enable",
      "comment.anonymous.review.enable",
      "comment.locate.enable",
    ]);

    commentConfig = {
      placeholder,
      anonymousEnabled,
      anonymousEmailRequired,
      anonymousWebsiteEnabled,
      reviewAll,
      reviewAnonymous,
      locateEnabled,
    };
  }
  const contentRootId = `page-content-${pageId}`;
  const contentSelector = `#${contentRootId} .md-content`;

  return (
    <MainLayout type="vertical" nopadding>
      <JsonLdScript id={`jsonld-page-${pageId}`} graph={jsonLdGraph} />
      <ImageLightbox />
      <div id={contentRootId} className="h-full w-full">
        {/* 参考 posts 头图区结构：保留大标题布局，去掉背景图/顶部信息条/标签 */}
        <div className="relative border-b border-border">
          <div className="mx-auto max-w-7xl px-6 py-10 pt-12 md:px-10">
            <div className="flex gap-6">
              <div className="min-w-0 flex-[8]">
                <h1 className="mb-2 text-4xl leading-tight md:text-6xl">
                  {title}
                </h1>
                {description ? (
                  <div className="pt-3 text-lg font-mono text-muted-foreground md:text-xl">
                    {description}
                  </div>
                ) : null}
              </div>
              <div className="hidden lg:block lg:flex-[2]" />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-12 pt-10 md:px-10">
          <div className="relative flex h-full gap-6">
            <div className="min-w-0 flex-[8]">
              <UniversalRenderer
                source={source}
                mode={mode}
                shikiTheme={shikiTheme}
              />
              {commentEnabled && commentConfig && (
                <CommentsSection
                  slug={slug}
                  allowComments={allowComments}
                  authorUid={authorUid}
                  commentConfig={commentConfig}
                />
              )}
            </div>

            <div className="sticky top-10 hidden h-full max-w-screen self-start lg:block lg:flex-[2]">
              <PostToc contentSelector={contentSelector} />
            </div>

            <div className="lg:hidden">
              <PostToc isMobile={true} contentSelector={contentSelector} />
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
