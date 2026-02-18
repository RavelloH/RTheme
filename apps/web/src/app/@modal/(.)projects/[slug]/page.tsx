import { cacheLife, cacheTag } from "next/cache";

import ProjectPaperModal from "@/app/@modal/(.)projects/[slug]/ProjectPaperModal";
import PostToc from "@/components/client/features/posts/PostToc";
import {
  ProjectDetailBody,
  ProjectDetailHeader,
} from "@/components/server/features/projects/ProjectDetailSections";
import { getConfigs } from "@/lib/server/config-cache";
import { getPublishedProjectDetail } from "@/lib/server/project-public";

interface ProjectDetailModalPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailModalPage({
  params,
}: ProjectDetailModalPageProps) {
  const { slug } = await params;
  return renderProjectDetailModalPage(slug);
}

async function renderProjectDetailModalPage(slug: string) {
  "use cache";
  const [{ project, mediaFileMap }, [siteURL, shikiTheme]] = await Promise.all([
    getPublishedProjectDetail(slug),
    getConfigs(["site.url", "site.shiki.theme"]),
  ]);

  const pageCacheTags = new Set<string>([
    "config/site.url",
    "config/site.shiki.theme",
    `projects/${project.slug}`,
    `users/${project.author.uid}`,
  ]);
  for (const tag of project.tags) {
    pageCacheTags.add(`tags/${tag.slug}`);
  }
  cacheTag(...Array.from(pageCacheTags));
  cacheLife("max");

  const contentRootId = `project-modal-content-${project.id}`;
  const contentSelector = `#${contentRootId} .md-content`;

  return (
    <ProjectPaperModal
      title={project.title}
      toc={<PostToc contentSelector={contentSelector} transparent={true} />}
    >
      <div id={contentRootId}>
        <ProjectDetailHeader project={project} variant="modal" />
        <div className="mx-auto max-w-6xl px-6 pb-6 pt-10 md:px-12">
          <ProjectDetailBody
            project={project}
            mediaFileMap={mediaFileMap}
            shikiTheme={shikiTheme}
            siteURL={siteURL}
            variant="modal"
          />
        </div>
      </div>
    </ProjectPaperModal>
  );
}
