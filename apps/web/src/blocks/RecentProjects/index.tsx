import RowGrid, { GridItem } from "@/components/RowGrid";
import ParallaxImageCarousel from "@/components/ParallaxImageCarousel";
import Marquee from "react-fast-marquee";
import LinkButton from "@/components/LinkButton";
import type { BlockConfig } from "@/blocks/types";

// 定义局部接口来描述预期的内容结构
interface WorksDescription {
  header?: { value: string };
  content?: { value: string };
}

interface WorksSummary {
  content?: { value: string | string[] };
  footer?: { value: { link: string; description: string } };
}

/**
 * ProjectsBlock - 服务端组件
 * 布局和静态内容在服务端渲染，直接使用客户端组件处理交互功能
 */
export default function ProjectsBlock({ config }: { config: BlockConfig }) {
  const content = config.content || {};

  // 类型断言
  const worksDescription = content.worksDescription as
    | WorksDescription
    | undefined;
  const worksSummary = content.worksSummary as WorksSummary | undefined;

  return (
    <RowGrid>
      {/* RTheme 项目展示 */}
      <GridItem
        areas={[1, 2, 3, 4, 5, 6]}
        width={2}
        mobileIndex={4}
        className="overflow-hidden block relative"
        fixedHeight={true}
      >
        <ParallaxImageCarousel
          images={[
            { url: "https://raw.ravelloh.top/rtheme/fork.webp" },
            { url: "https://raw.ravelloh.top/rtheme/fork.webp" },
          ]}
          alt="RTheme showcase"
        />

        <div className="p-15 absolute inset-0 z-10 flex flex-col justify-end">
          <div className="text-5xl text-white" data-fade-char>
            RTheme
          </div>
          <div className="text-2xl text-white" data-fade-char>
            RTheme 是一个 Tailwind 主题设计语言。
          </div>
        </div>
      </GridItem>

      {/* 标题 Marquee（PROJECTS） */}
      <GridItem
        areas={[7, 8, 9]}
        width={4}
        mobileIndex={0}
        className="flex items-center uppercase bg-primary text-primary-foreground"
      >
        <Marquee speed={40} autoFill={true} className="h-full text-7xl">
          PROJECTS&nbsp;&nbsp;/&nbsp;&nbsp;
        </Marquee>
      </GridItem>

      {/* 标题 Marquee（作品） */}
      <GridItem
        areas={[10, 11, 12]}
        width={4}
        className="flex items-center uppercase"
        mobileIndex={1}
      >
        <Marquee
          speed={40}
          direction="right"
          autoFill={true}
          className="h-full text-7xl"
        >
          作品&nbsp;&nbsp;/&nbsp;&nbsp;
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
          {worksDescription?.header?.value || "My main tech stack includes"}
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
            {worksDescription?.content?.value || "React / ..."}
          </div>
        </div>
      </GridItem>

      {/* Timepulse 项目展示 */}
      <GridItem
        areas={[7, 8, 9, 10, 11, 12]}
        width={2}
        className="overflow-hidden block relative"
        mobileIndex={5}
        fixedHeight={true}
      >
        <ParallaxImageCarousel
          images={[
            {
              url: "https://raw.ravelloh.top/20250724/image.8hgs168oya.webp",
            },
            {
              url: "https://raw.ravelloh.top/20250724/image.2yynl10qrg.webp",
            },
          ]}
          alt="Timepulse showcase"
        />

        <div className="p-15 absolute inset-0 z-10 flex flex-col justify-end">
          <div className="text-5xl text-white" data-fade-char>
            Timepulse
          </div>
          <div className="text-2xl text-white" data-fade-char>
            玻璃态风格的网页正计时/倒计时/世界时钟。
          </div>
        </div>
      </GridItem>

      {/* RTheme 第二个项目展示 */}
      <GridItem
        areas={[1, 2, 3, 4, 5, 6]}
        width={2}
        mobileIndex={6}
        className="overflow-hidden block relative"
        fixedHeight={true}
      >
        <ParallaxImageCarousel
          images={[
            {
              url: "https://raw.ravelloh.top/20250325/image.7p3rq9hok6.webp",
            },
          ]}
          alt="RTheme showcase"
        />

        <div className="p-15 absolute inset-0 z-10 flex flex-col justify-end">
          <div className="text-5xl text-white" data-fade-char>
            RTheme
          </div>
          <div className="text-2xl text-white" data-fade-char>
            RTheme 是一个 Tailwind 主题设计语言。
          </div>
        </div>
      </GridItem>

      {/* 作品总结（静态内容） */}
      <GridItem
        areas={[7, 8, 9, 10, 11]}
        width={12 / 5}
        mobileIndex={7}
        className="flex items-center px-10 py-15"
      >
        <div className="text-2xl block" data-line-reveal>
          {Array.isArray(worksSummary?.content?.value) ? (
            worksSummary!.content!.value.map((item: string, index: number) => (
              <div key={`works-${index}`}>{item || " "}</div>
            ))
          ) : (
            <div>{(worksSummary?.content?.value as string) || " "}</div>
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
          href={worksSummary?.footer?.value?.link || "/works"}
          text={
            worksSummary?.footer?.value?.description || "View more projects"
          }
        />
      </GridItem>
    </RowGrid>
  );
}
