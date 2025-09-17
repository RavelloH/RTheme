import { generateMetadata } from "@/lib/shared/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import Image from "next/image";
import Marquee from "@/components/Marquee";

export const metadata = await generateMetadata(
  {
    title: "首页",
    description: "欢迎访问我们的网站",
  },
  {
    pathname: "/",
  }
);

export default function Home() {
  return (
    <>
      <div className="h-[calc(100vh-156px)]">
        <HorizontalScroll
          className="h-full"
          enableParallax={true}
          enableFadeElements={true}
          enableLineReveal={true}
          snapToElements={false}
        >
          <RowGrid>
            {/* 主页介绍区域 */}
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={4.5}
              className="flex items-center justify-center text-5xl"
            >
              轮播图
            </GridItem>
            <GridItem
              areas={[7, 8, 9]}
              width={9}
              className="flex items-center p-12 text-8xl font-bold overflow-hidden"
            >
              <div data-fade data-parallax="-0.5">
                <span>RavelloH&apos;s Blog</span>
              </div>
            </GridItem>
            <GridItem
              areas={[10, 11, 12]}
              width={9}
              className=" flex items-center justify-start text-8xl"
            >
              <div className="h-full aspect-square mr-4 relative">
                <Image
                  src="/avatar.jpg"
                  alt="logo"
                  width={200}
                  height={200}
                  className="h-full w-auto object-cover"
                />
              </div>
              <div
                className="flex-1 flex items-center justify-end pr-12 text-8xl"
                data-fade
              >
                <span data-parallax="0.5">Beginning of meditation.</span>
              </div>
            </GridItem>
            <GridItem
              areas={[1]}
              width={14}
              className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl"
            >
              <span>Welcome. I&apos;m...</span>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
              width={1.4}
              className="px-10 py-15 text-2xl flex flex-col justify-between"
            >
              <div>
                <div className="text-7xl" data-fade-char>
                  RavelloH \ 拉韦洛
                </div>
                <div className="block mt-4" data-line-reveal>
                  <div>CTFer，</div>
                  <div>Web 全栈，</div>
                  <div>开源爱好者，</div>
                  <div>React 拥护者，</div>
                  <div>Node 爬虫工程师，</div>
                  <div>NeutralPress 开发者。</div>
                </div>
              </div>
              <div>
                <div className="mt-10">
                  <div data-fade-char>共有文章 1128 篇，</div>
                  <div data-fade-char>收录作品 12 件。</div>
                </div>
              </div>
            </GridItem>
            <GridItem
              areas={[12]}
              width={14}
              className="flex items-center uppercase px-10 text-2xl"
            >
              Learn more about me
            </GridItem>
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={2}
              className="flex items-center uppercase"
            >
              代表作
            </GridItem>

            <GridItem
              areas={[7, 8, 9]}
              width={4}
              className="flex items-center uppercase bg-primary text-primary-foreground"
            >
              <Marquee speed={40} autoFill={true} className="h-full text-7xl">
                WORKS&nbsp;/&nbsp;
              </Marquee>
            </GridItem>
            <GridItem
              areas={[10, 11, 12]}
              width={4}
              className="flex items-center uppercase"
            >
              <Marquee
                speed={40}
                direction="right"
                autoFill={true}
                className="h-full text-7xl"
              >
                作品&nbsp;/&nbsp;
              </Marquee>
            </GridItem>
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={2}
              className="flex items-center uppercase"
            >
              作品1
            </GridItem>
            <GridItem
              areas={[7, 8, 9, 10, 11, 12]}
              width={2}
              className="flex items-center uppercase"
            >
              作品2
            </GridItem>
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={2}
              className="flex items-center uppercase"
            >
              作品3
            </GridItem>
            <GridItem
              areas={[7, 8, 9, 10, 11, 12]}
              width={2}
              className="flex items-center uppercase"
            >
              作品4
            </GridItem>

            <GridItem
              areas={[1,2,3]}
              width={4}
              className="flex items-center uppercase bg-primary text-primary-foreground"
            >
              <Marquee speed={40} autoFill={true} className="h-full text-7xl">
                POSTS&nbsp;/&nbsp;
              </Marquee>
            </GridItem>
            <GridItem
              areas={[4,5,6]}
              width={4}
              className="flex items-center uppercase"
            >
              <Marquee
                speed={40}
                direction="right"
                autoFill={true}
                className="h-full text-7xl"
              >
                文章&nbsp;/&nbsp;
              </Marquee>
            </GridItem>

            <GridItem
              areas={[10, 11, 12]}
              width={40}
              className="flex items-center uppercase"
            >
              测试
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </div>
    </>
  );
}
