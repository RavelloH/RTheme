"use client";

import { useEffect, useState } from "react";
import {
  RiCalendarTodoLine,
  RiCodeLine,
  RiGitForkLine,
  RiProfileLine,
  RiStarFill,
} from "@remixicon/react";

import type {
  FeaturedProjectItem,
  FeaturedProjectsData,
} from "@/blocks/collection/FeaturedProjects/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import type { GridArea } from "@/components/client/layout/RowGrid";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import type { DynamicIcon as DynamicIconType } from "@/components/ui/DynamicIcon";
import Link from "@/components/ui/Link";
import ParallaxImageCarousel from "@/components/ui/ParallaxImageCarousel";

const FULL_AREAS: GridArea[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * 带动态图标的链接客户端组件
 */
function DynamicIconLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [DynamicIcon, setDynamicIcon] = useState<typeof DynamicIconType | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // 动态导入 DynamicIcon 组件
    import("@/components/ui/DynamicIcon")
      .then((module) => {
        if (isMounted) {
          setDynamicIcon(() => module.DynamicIcon);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load DynamicIcon:", error);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Link href={href} className={className}>
      {loading ? (
        // 加载中显示占位符
        <span
          style={{
            display: "inline-block",
            width: "0.875rem",
            height: "0.875rem",
          }}
        />
      ) : DynamicIcon ? (
        <DynamicIcon url={href} size="0.875rem" />
      ) : null}
      {children}
    </Link>
  );
}

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
    const suffix =
      parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
    return `${parsed.hostname}${suffix}`.slice(0, 42);
  } catch {
    return `LINK ${index + 1}`;
  }
}

function getProjectStatusBadge(status: FeaturedProjectItem["status"]): {
  label: string;
  className: string;
} | null {
  if (status === "DEVELOPING") {
    return { label: "DEVELOPING", className: "text-success" };
  }

  if (status === "ARCHIVED") {
    return { label: "ARCHIVED", className: "text-warning" };
  }

  return null;
}

function renderProjectCard(project: FeaturedProjectItem, index: number) {
  const detailHref = `/projects/${project.slug}`;
  const languagesText = project.languages.join(" / ");
  const licenseText = project.license?.trim();
  const periodText = formatPeriod(project.startedAt, project.completedAt);
  const statusBadge = getProjectStatusBadge(project.status);

  return (
    <GridItem
      key={`featured-project-${project.id}`}
      areas={FULL_AREAS}
      width={1.5}
      fixedHeight={true}
      mobileIndex={index + 1}
      className="overflow-hidden relative"
    >
      <div className="relative h-full w-full group">
        <Link href={detailHref} className="absolute inset-0 z-10">
          <span className="sr-only">{project.title}</span>
        </Link>

        {project.images.length > 0 ? (
          <ParallaxImageCarousel
            images={project.images}
            alt={`${project.title} cover`}
            className="!opacity-100"
            parallaxSpeed={-1}
          />
        ) : (
          <div className="h-full w-full bg-background" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 z-10 p-8 md:p-12 pointer-events-none">
          {/* 标题 - hover时显示下划线 */}
          <h3 className="text-4xl md:text-6xl leading-tight text-foreground">
            <span
              className="relative inline bg-[linear-gradient(currentColor,currentColor)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]"
              data-fade-char
            >
              {project.title}
            </span>
          </h3>
          {project.links.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2 pointer-events-auto">
              {project.links.map((link, linkIndex) => (
                <span
                  key={`${project.id}-featured-link-${linkIndex}`}
                  className="relative z-30 pointer-events-auto"
                >
                  <Link
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center rounded-sm border border-muted px-2 py-1 text-sm text-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/30 transition-colors duration-500"
                    presets={["arrow-out"]}
                  >
                    <DynamicIconLink
                      href={link}
                      className="inline-flex items-center gap-1.5"
                    >
                      <span>{formatLinkLabel(link, linkIndex)}</span>
                    </DynamicIconLink>

                    <span className="sr-only">在新窗口打开</span>
                  </Link>
                </span>
              ))}
            </div>
          ) : null}

          {/* 其他信息 */}
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs md:text-sm uppercase text-foreground">
            <span className="flex items-center gap-1" data-fade>
              <RiStarFill size="1.2em" className="text-warning" />
              {project.stars}
            </span>
            <span className="flex items-center gap-1" data-fade>
              <RiGitForkLine size="1.2em" /> {project.forks}
            </span>
            {licenseText && (
              <span className="flex items-center gap-1" data-fade>
                <RiProfileLine size="1.2em" /> {licenseText}
              </span>
            )}
            {periodText && (
              <span className="flex items-center gap-1" data-fade>
                <RiCalendarTodoLine size="1.2em" /> {periodText}
              </span>
            )}
            {statusBadge ? (
              <span className={statusBadge.className} data-fade>
                {statusBadge.label}
              </span>
            ) : null}
            {project.isFeatured ? (
              <span className="text-primary" data-fade>
                FEATURED
              </span>
            ) : null}
          </div>

          {languagesText && (
            <div className="mt-4 text-xs md:text-sm flex gap-1 items-center">
              <RiCodeLine size="1.2em" />{" "}
              <span data-fade-word className="w-full">
                {languagesText}
              </span>
            </div>
          )}

          <p
            className="mt-4 text-sm md:text-lg leading-relaxed text-foreground"
            data-fade-word
          >
            {project.description}
          </p>
        </div>
      </div>
    </GridItem>
  );
}

export default function FeaturedProjectsBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<FeaturedProjectsData>(block.runtime);
  const displayProjects = data.displayProjects || [];

  if (displayProjects.length === 0) {
    return;
  }

  return <RowGrid>{displayProjects.map(renderProjectCard)}</RowGrid>;
}
