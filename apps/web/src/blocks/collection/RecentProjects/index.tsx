import Marquee from "react-fast-marquee";

import type {
  ProjectDisplayItem,
  ProjectsBlockConfig,
  ProjectsData,
} from "@/blocks/collection/RecentProjects/types";
import { ProcessedText } from "@/blocks/core/components";
import type { BlockComponentProps } from "@/blocks/core/definition";
import {
  extractBlockText,
  replacePlaceholders,
} from "@/blocks/core/lib/shared";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import type { GridArea } from "@/components/client/layout/RowGrid";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";
import LinkButton from "@/components/ui/LinkButton";
import ParallaxImageCarousel from "@/components/ui/ParallaxImageCarousel";

const PROJECT_CARD_LAYOUTS: Array<{ areas: GridArea[]; mobileIndex: number }> =
  [
    { areas: [1, 2, 3, 4, 5, 6], mobileIndex: 4 },
    { areas: [7, 8, 9, 10, 11, 12], mobileIndex: 5 },
    { areas: [1, 2, 3, 4, 5, 6], mobileIndex: 6 },
  ];

const EMPTY_PROJECT_TITLES = ["Project 01", "Project 02", "Project 03"];
const MARQUEE_SPEED = 40;

function getProjectFallbackTitle(index: number): string {
  return EMPTY_PROJECT_TITLES[index] || "Project";
}

/**
 * ProjectsBlock - 服务端组件
 * 布局和静态内容在服务端渲染，直接使用客户端组件处理交互功能
 */
export default function ProjectsBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<ProjectsData>(block.runtime);
  const content = (block.content as ProjectsBlockConfig["content"]) || {};
  const displayProjects = data.displayProjects || [];
  const { worksDescription, worksSummary } = content;

  const marqueeLine1 = content.title?.line1 || "PROJECTS";
  const marqueeLine2 = content.title?.line2 || "项目";

  const projectSlots: Array<ProjectDisplayItem | null> = Array.from(
    { length: 3 },
    (_, index) => displayProjects[index] || null,
  );
  const firstProject = projectSlots[0] || null;
  const secondProject = projectSlots[1] || null;
  const thirdProject = projectSlots[2] || null;

  const renderProjectCard = (
    project: ProjectDisplayItem | null,
    index: number,
    areas: GridArea[],
    mobileIndex: number,
  ) => {
    const fallbackDescription = "暂无项目数据，等待新的项目发布。";
    const title = project?.title || getProjectFallbackTitle(index);
    const detailHref = project ? `/projects/${project.slug}` : "/projects";

    return (
      <GridItem
        key={`project-${project?.id ?? `empty-${index}`}`}
        areas={areas}
        width={2}
        mobileIndex={mobileIndex}
        className="overflow-hidden block relative group"
        fixedHeight={true}
      >
        <Link href={detailHref} className="absolute inset-0 z-20">
          <span className="sr-only">{title}</span>
        </Link>

        {project?.images?.length ? (
          <ParallaxImageCarousel
            images={project.images}
            alt={`${project.title} showcase`}
          />
        ) : (
          <div className="absolute inset-0 bg-background" />
        )}

        <div className="p-15 absolute inset-0 z-10 flex flex-col justify-end">
          <div className="text-5xl text-foreground">
            <span
              className="relative inline bg-[linear-gradient(currentColor,currentColor)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]"
              data-fade-char
            >
              {title}
            </span>
          </div>
          <div className="text-2xl text-foreground line-clamp-1 pt-2" data-fade>
            {project?.description || fallbackDescription}
          </div>
        </div>
      </GridItem>
    );
  };

  return (
    <RowGrid>
      {renderProjectCard(
        firstProject,
        0,
        PROJECT_CARD_LAYOUTS[0]!.areas,
        PROJECT_CARD_LAYOUTS[0]!.mobileIndex,
      )}

      {/* 标题 Marquee（PROJECTS） */}
      <GridItem
        areas={[7, 8, 9]}
        width={4}
        mobileIndex={0}
        className="flex items-center uppercase bg-primary text-primary-foreground"
      >
        <Marquee
          speed={MARQUEE_SPEED}
          autoFill={true}
          className="h-full text-7xl"
        >
          {replacePlaceholders(marqueeLine1, data)}&nbsp;&nbsp;/&nbsp;&nbsp;
        </Marquee>
      </GridItem>

      {/* 标题 Marquee（项目） */}
      <GridItem
        areas={[10, 11, 12]}
        width={4}
        className="flex items-center uppercase"
        mobileIndex={1}
      >
        <Marquee
          speed={MARQUEE_SPEED}
          direction="right"
          autoFill={true}
          className="h-full text-7xl"
        >
          {replacePlaceholders(marqueeLine2, data)}&nbsp;&nbsp;/&nbsp;&nbsp;
        </Marquee>
      </GridItem>

      {/* 技术栈标题（静态内容） */}
      <GridItem
        areas={[1]}
        width={12}
        height={0.1}
        mobileIndex={2}
        className="flex items-center px-10 text-2xl bg-primary text-primary-foreground uppercase"
      >
        <span data-fade-word>
          <ProcessedText
            text={extractBlockText(worksDescription?.header)}
            data={data}
            inline
            disableMarkdown
          />
        </span>
      </GridItem>

      {/* 技术栈内容（静态内容） */}
      <GridItem
        areas={[2, 3, 4, 5, 6]}
        width={12 / 5}
        mobileIndex={3}
        className="flex items-center px-10 py-15"
      >
        <div className="text-2xl block">
          <div data-fade-word>
            <ProcessedText
              text={worksDescription?.content}
              data={data}
              inline
            />
          </div>
        </div>
      </GridItem>

      {renderProjectCard(
        secondProject,
        1,
        PROJECT_CARD_LAYOUTS[1]!.areas,
        PROJECT_CARD_LAYOUTS[1]!.mobileIndex,
      )}

      {renderProjectCard(
        thirdProject,
        2,
        PROJECT_CARD_LAYOUTS[2]!.areas,
        PROJECT_CARD_LAYOUTS[2]!.mobileIndex,
      )}

      {/* 项目总结（静态内容） */}
      <GridItem
        areas={[7, 8, 9, 10, 11]}
        width={12 / 5}
        mobileIndex={7}
        className="flex items-center px-10 py-15"
      >
        <div className="text-2xl block" data-line-reveal>
          {Array.isArray(worksSummary?.content) ? (
            worksSummary!.content.map((item: string, index: number) => (
              <div key={`works-${index}`}>
                <ProcessedText text={item} data={data} inline />
              </div>
            ))
          ) : (
            <div>
              <ProcessedText
                text={worksSummary?.content as unknown as string}
                data={data}
                inline
              />
            </div>
          )}
        </div>
      </GridItem>

      {/* 查看更多链接 */}
      <GridItem
        areas={[12]}
        width={12}
        height={0.1}
        mobileIndex={8}
        className="flex items-center uppercase text-2xl"
      >
        <LinkButton
          mode="link"
          href={replacePlaceholders(
            worksSummary?.footer?.link ?? "/projects",
            data,
          )}
          text={replacePlaceholders(
            worksSummary?.footer?.text ?? "View more projects",
            data,
          )}
        />
      </GridItem>
    </RowGrid>
  );
}
