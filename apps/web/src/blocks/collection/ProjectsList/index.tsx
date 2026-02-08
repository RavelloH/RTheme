import {
  RiCalendarTodoLine,
  RiCodeLine,
  RiGitForkLine,
  RiProfileLine,
  RiStarFill,
} from "@remixicon/react";

import type {
  ProjectsListData,
  ProjectsListItem,
} from "@/blocks/collection/ProjectsList/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import type { GridArea } from "@/components/client/layout/RowGrid";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";
import ParallaxImageCarousel from "@/components/ui/ParallaxImageCarousel";

const TOP_AREAS: GridArea[] = [1, 2, 3, 4, 5, 6];
const BOTTOM_AREAS: GridArea[] = [7, 8, 9, 10, 11, 12];

function formatDate(value: string | Date | null): string {
  if (!value) return "未记录";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return date.toLocaleDateString("zh-CN");
}

function formatPeriod(
  startedAt: string | Date | null,
  completedAt: string | Date | null,
): string | undefined {
  const start = formatDate(startedAt);
  const end = completedAt ? formatDate(completedAt) : "至今";

  if (start === "未记录" && end === "至今") {
    return undefined;
  }

  return `${start} - ${end}`;
}

function formatLinkLabel(link: string, index: number): string {
  try {
    const parsed = new URL(link);
    const path =
      parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
    return `${parsed.hostname}${path}`.slice(0, 42);
  } catch {
    return `LINK ${index + 1}`;
  }
}

function ProjectImageBlock({
  project,
  index,
  areas,
  mobileIndex,
}: {
  project: ProjectsListItem;
  index: number;
  areas: GridArea[];
  mobileIndex: number;
}) {
  const title =
    project.title || `Project ${String(index + 1).padStart(2, "0")}`;
  const detailHref = `/projects/${project.slug}`;

  return (
    <GridItem
      areas={areas}
      width={2}
      mobileIndex={mobileIndex}
      className="relative overflow-hidden bg-background group"
      fixedHeight={true}
    >
      <Link href={detailHref} className="absolute inset-0 z-10">
        <span className="sr-only">{title}</span>
      </Link>

      {project.images.length > 0 ? (
        <ParallaxImageCarousel
          images={project.images}
          alt={`${title} cover`}
          className="!opacity-100"
        />
      ) : (
        <div className="absolute inset-0 bg-background" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 z-10 p-8 md:p-10 pointer-events-none">
        <h3 className="text-4xl md:text-5xl leading-tight text-foreground">
          <span
            className="relative inline bg-[linear-gradient(white,white)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]"
            data-fade-char
          >
            {title}
          </span>
        </h3>
      </div>
    </GridItem>
  );
}

function ProjectTextBlock({
  project,
  areas,
  mobileIndex,
}: {
  project: ProjectsListItem;
  areas: GridArea[];
  mobileIndex: number;
}) {
  const detailHref = `/projects/${project.slug}`;
  const languagesText = project.languages.join(" / ");
  const licenseText = project.license?.trim();
  const periodText = formatPeriod(project.startedAt, project.completedAt);

  return (
    <GridItem
      areas={areas}
      width={2}
      mobileIndex={mobileIndex}
      className="bg-background"
      fixedHeight={true}
    >
      <div className="h-full flex flex-col justify-between gap-6 p-8 md:p-10">
        <p
          className="text-sm md:text-lg leading-relaxed text-foreground/90 line-clamp-5"
          data-fade-word
        >
          {project.description}
        </p>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs md:text-sm uppercase text-foreground">
            <span className="flex items-center gap-1" data-fade>
              <RiStarFill size="1.2em" className="text-warning" />
              {project.stars}
            </span>
            <span className="flex items-center gap-1" data-fade>
              <RiGitForkLine size="1.2em" />
              {project.forks}
            </span>
            {licenseText ? (
              <span className="flex items-center gap-1" data-fade>
                <RiProfileLine size="1.2em" />
                {licenseText}
              </span>
            ) : null}
            {periodText ? (
              <span className="flex items-center gap-1" data-fade>
                <RiCalendarTodoLine size="1.2em" />
                {periodText}
              </span>
            ) : null}
            {project.isFeatured ? (
              <span className="text-primary" data-fade>
                FEATURED
              </span>
            ) : null}
          </div>

          {languagesText ? (
            <div className="text-xs md:text-sm flex gap-1 items-center text-foreground">
              <RiCodeLine size="1.2em" />
              <span data-fade-word className="w-full">
                {languagesText}
              </span>
            </div>
          ) : null}

          {project.links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {project.links.map((link, linkIndex) => (
                <Link
                  key={`${project.id}-link-${linkIndex}`}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-sm border border-muted px-2 py-1 text-xs text-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/20 transition-colors duration-500"
                  presets={["dynamic-icon", "arrow-out"]}
                >
                  <span>{formatLinkLabel(link, linkIndex)}</span>
                </Link>
              ))}
            </div>
          ) : null}

          <div>
            <Link
              href={detailHref}
              className="inline-flex text-xs md:text-sm uppercase"
              presets={["hover-color", "arrow"]}
            >
              查看项目详情
            </Link>
          </div>
        </div>
      </div>
    </GridItem>
  );
}

export default function ProjectsListBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<ProjectsListData>(block.runtime);
  const displayProjects = data.displayProjects || [];

  if (displayProjects.length === 0) {
    return (
      <RowGrid>
        <GridItem
          areas={[1, 2, 3, 4, 5, 6]}
          width={2}
          mobileIndex={0}
          fixedHeight={true}
          className="bg-muted/30 flex items-center justify-center"
        >
          <div className="text-sm text-muted-foreground">暂无项目数据</div>
        </GridItem>
        <GridItem
          areas={[7, 8, 9, 10, 11, 12]}
          width={2}
          mobileIndex={1}
          fixedHeight={true}
          className="bg-muted/20"
        >
          <div className="h-full w-full" />
        </GridItem>
      </RowGrid>
    );
  }

  return (
    <RowGrid>
      {displayProjects.map((project, index) => {
        const imageOnTop = index % 2 === 0;
        const imageAreas = imageOnTop ? TOP_AREAS : BOTTOM_AREAS;
        const textAreas = imageOnTop ? BOTTOM_AREAS : TOP_AREAS;
        const mobileBase = index * 2;

        return (
          <div key={`projects-list-${project.id}`} className="contents">
            <ProjectImageBlock
              project={project}
              index={index}
              areas={imageAreas}
              mobileIndex={mobileBase}
            />
            <ProjectTextBlock
              project={project}
              areas={textAreas}
              mobileIndex={mobileBase + 1}
            />
          </div>
        );
      })}
    </RowGrid>
  );
}
