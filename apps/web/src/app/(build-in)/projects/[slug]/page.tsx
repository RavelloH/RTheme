import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";

import PostToc from "@/components/client/features/posts/PostToc";
import MainLayout from "@/components/client/layout/MainLayout";
import {
  ProjectDetailBody,
  ProjectDetailHeader,
} from "@/components/server/features/projects/ProjectDetailSections";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { getConfigs } from "@/lib/server/config-cache";
import {
  getPublishedProjectDetail,
  getPublishedProjectSeo,
  getPublishedProjectStaticParams,
} from "@/lib/server/project-public";
import { generateMetadata as generateSEOMetadata } from "@/lib/server/seo";

interface ProjectDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getPublishedProjectStaticParams();
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedProjectSeo(slug);

  if (!project) {
    return generateSEOMetadata({
      title: "项目不存在",
      robots: {
        index: false,
        follow: false,
      },
    });
  }

  return generateSEOMetadata(
    {
      title: project.title,
      description:
        project.metaDescription ||
        project.description ||
        `查看项目 ${project.title} 的详细介绍`,
      keywords: project.metaKeywords || undefined,
      robots: {
        index: project.robotsIndex,
      },
    },
    {
      pathname: `/projects/${project.slug}`,
    },
  );
}

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  "use cache";

  const { slug } = await params;
  const [{ project, mediaFileMap }, [siteURL, shikiTheme]] = await Promise.all([
    getPublishedProjectDetail(slug),
    getConfigs(["site.url", "site.shiki.theme"]),
  ]);

  cacheTag(
    "projects",
    `projects/${project.slug}`,
    `users/${project.author.uid}`,
  );
  cacheLife("max");

  const contentRootId = "project-detail-content";
  const contentSelector = `#${contentRootId} .md-content`;
  const featuredHeroHeightClassName = "h-[42.1em]";

  return (
    <MainLayout type="vertical" nopadding>
      <ImageLightbox />
      <div className="h-full w-full">
        <ProjectDetailHeader
          project={project}
          variant="page"
          heroHeightClassName={featuredHeroHeightClassName}
        />

        <div
          id={contentRootId}
          className="px-6 md:px-10 max-w-7xl mx-auto pt-10 pb-12 flex gap-6 relative h-full"
        >
          <div className="min-w-0 flex-[8]">
            <ProjectDetailBody
              project={project}
              mediaFileMap={mediaFileMap}
              shikiTheme={shikiTheme}
              siteURL={siteURL}
              variant="page"
            />
          </div>

          <div className="sticky top-10 hidden h-full max-w-screen self-start lg:block lg:flex-[2]">
            <PostToc contentSelector={contentSelector} />
          </div>

          <div className="lg:hidden">
            <PostToc isMobile={true} contentSelector={contentSelector} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
