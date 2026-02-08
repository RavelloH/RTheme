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
