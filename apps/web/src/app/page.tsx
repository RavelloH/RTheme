import { generateMetadata } from "@/lib/server/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import ParallaxImageCarousel from "@/components/ParallaxImageCarousel";
import Marquee from "react-fast-marquee";
import Link from "@/components/Link";
import PostCard from "@/components/PostCard";
import MainLayout from "@/components/MainLayout";
import HomeTitle from "./home/HomeTitle";
import HomeSlogan from "./home/HomeSlogan";
import LinkButton from "@/components/LinkButton";
import { getSystemPageConfig, getBlocksAreas } from "@/lib/server/pageCache";
import { createPageConfigBuilder } from "@/lib/server/pageUtils";

export const metadata = await generateMetadata(
  {
    title: "首页",
    description: "欢迎访问我们的网站",
  },
  {
    pathname: "/",
  },
);

export default async function Home() {
  // 获取系统页面配置
  const systemConfig = await getSystemPageConfig("/");
  const config = createPageConfigBuilder(systemConfig);
  return (
    <>
      <MainLayout type="horizontal">
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
              height={0.5}
              className="flex items-center justify-center text-5xl"
            >
              轮播图
            </GridItem>
            <GridItem
              areas={[7, 8, 9]}
              width={9}
              height={0.3}
              className="flex items-center text-8xl overflow-hidden"
            >
              <HomeTitle title={"RavelloH's Blog"} />
            </GridItem>
            <GridItem
              areas={[10, 11, 12]}
              width={9}
              height={0.3}
              className=" flex items-center justify-start text-8xl"
            >
              <HomeSlogan slogan={"Beginning of meditation."} />
            </GridItem>
          </RowGrid>
          {config.isBlockEnabled(1) && (
            <RowGrid>
              {config.getBlockHeader(1) && (
                <GridItem
                  areas={[1]}
                  width={14}
                  height={0.1}
                  className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
                >
                  <span>{config.getBlockHeader(1)}</span>
                </GridItem>
              )}

              <GridItem
                areas={getBlocksAreas(
                  1,
                  !!config.getBlockHeader(1),
                  !!(
                    config.getBlockFooterLink(1) || config.getBlockFooterDesc(1)
                  ),
                )}
                width={
                  14 /
                  getBlocksAreas(
                    1,
                    !!config.getBlockHeader(1),
                    !!(
                      config.getBlockFooterLink(1) ||
                      config.getBlockFooterDesc(1)
                    ),
                  ).length
                }
                height={1}
                className="px-10 py-15 text-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="text-7xl" data-fade-char>
                    <p>{config.getBlockTitle(1)}</p>
                  </div>
                  <div className="block mt-4" data-line-reveal>
                    {config.getBlockContent(1).map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mt-10">
                    {config.getBlockContent(1, "bottom").map((line, index) => (
                      <div key={index} data-fade-char>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </GridItem>
              {(config.getBlockFooterLink(1) ||
                config.getBlockFooterDesc(1)) && (
                <GridItem
                  areas={[12]}
                  width={14}
                  height={0.1}
                  className="flex items-center uppercase text-2xl"
                >
                  <LinkButton
                    mode="link"
                    href={config.getBlockFooterLink(1)}
                    text={config.getBlockFooterDesc(1)}
                  />
                </GridItem>
              )}
            </RowGrid>
          )}
          <RowGrid>
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={2}
              mobileIndex={4}
              className="overflow-hidden block relative"
              fixedHeight={true}
            >
              <ParallaxImageCarousel
                images={[
                  "https://raw.ravelloh.top/rtheme/fork.webp",
                  "https://raw.ravelloh.top/rtheme/fork.webp",
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

            <GridItem
              areas={[1]}
              width={12}
              height={0.1}
              mobileIndex={2}
              className="flex items-center px-10 text-2xl bg-primary text-primary-foreground uppercase"
            >
              <span data-fade-word>
                {config.getComponentHeader("works-description")}
              </span>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6]}
              width={12 / 5}
              mobileIndex={3}
              className="flex items-center px-10 py-15"
            >
              <div className="text-2xl block">
                <div data-fade-word>
                  {config.getComponentContent("works-description")}
                </div>
              </div>
            </GridItem>

            <GridItem
              areas={[7, 8, 9, 10, 11, 12]}
              width={2}
              className="overflow-hidden block relative"
              mobileIndex={5}
              fixedHeight={true}
            >
              <ParallaxImageCarousel
                images={[
                  "https://raw.ravelloh.top/20250724/image.8hgs168oya.webp",
                  "https://raw.ravelloh.top/20250724/image.2yynl10qrg.webp",
                ]}
                alt="RTheme showcase"
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
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={2}
              mobileIndex={6}
              className="overflow-hidden block relative"
              fixedHeight={true}
            >
              <ParallaxImageCarousel
                images={[
                  "https://raw.ravelloh.top/20250325/image.7p3rq9hok6.webp",
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
            <GridItem
              areas={[7, 8, 9, 10, 11]}
              width={12 / 5}
              mobileIndex={7}
              className="flex items-center px-10 py-15"
            >
              <div className="text-2xl block" data-line-reveal>
                {config
                  .getComponentContentArray("works-summary")
                  ?.map((item, index) => {
                    return <div key={index}>{item || " "}</div>;
                  })}
              </div>
            </GridItem>
            <GridItem
              areas={[12]}
              width={12}
              height={0.1}
              mobileIndex={8}
              className="flex items-center uppercase text-2xl"
            >
              <LinkButton
                mode="link"
                href={config.getComponentFooterLink("works-summary", "/works")}
                text={config.getComponentFooterDesc(
                  "works-summary",
                  "View more projects",
                )}
              />
            </GridItem>
          </RowGrid>
          {config.isBlockEnabled(2) && (
            <RowGrid>
              {config.getBlockHeader(2) && (
                <GridItem
                  areas={[1]}
                  width={14}
                  height={0.1}
                  className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
                >
                  <span>{config.getBlockHeader(2)}</span>
                </GridItem>
              )}

              <GridItem
                areas={getBlocksAreas(
                  2,
                  !!config.getBlockHeader(2),
                  !!(
                    config.getBlockFooterLink(2) || config.getBlockFooterDesc(2)
                  ),
                )}
                width={
                  14 /
                  getBlocksAreas(
                    2,
                    !!config.getBlockHeader(2),
                    !!(
                      config.getBlockFooterLink(2) ||
                      config.getBlockFooterDesc(2)
                    ),
                  ).length
                }
                height={1}
                className="px-10 py-15 text-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="text-7xl" data-fade-char>
                    <p>{config.getBlockTitle(2)}</p>
                  </div>
                  <div className="block mt-4" data-line-reveal>
                    {config.getBlockContent(2).map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mt-10">
                    {config.getBlockContent(2, "bottom").map((line, index) => (
                      <div key={index} data-fade-char>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </GridItem>
              {(config.getBlockFooterLink(2) ||
                config.getBlockFooterDesc(2)) && (
                <GridItem
                  areas={[12]}
                  width={14}
                  height={0.1}
                  className="flex items-center uppercase text-2xl"
                >
                  <LinkButton
                    mode="link"
                    href={config.getBlockFooterLink(2)}
                    text={config.getBlockFooterDesc(2)}
                  />
                </GridItem>
              )}
            </RowGrid>
          )}
          <RowGrid>
            <GridItem
              areas={[1, 2, 3]}
              width={4}
              className="flex items-center uppercase bg-primary text-primary-foreground"
            >
              <Marquee speed={40} autoFill={true} className="h-full text-7xl">
                POSTS&nbsp;&nbsp;/&nbsp;&nbsp;
              </Marquee>
            </GridItem>
            <GridItem
              areas={[4, 5, 6]}
              width={4}
              className="flex items-center uppercase"
            >
              <Marquee
                speed={40}
                direction="right"
                autoFill={true}
                className="h-full text-7xl"
              >
                文章&nbsp;&nbsp;/&nbsp;&nbsp;
              </Marquee>
            </GridItem>
            <GridItem areas={[7, 8, 9]} width={4} height={0.4} className="">
              <PostCard
                title="Minecraft Meteor 使用指南"
                date="2025/08/01"
                category={["游戏", "文档"]}
                tags={["Minecraft", "Meteor"]}
                cover="https://raw.ravelloh.top/20250228/meteor.webp"
              />
            </GridItem>

            <GridItem areas={[10, 11, 12]} width={4} height={0.4} className="">
              <PostCard
                title="使用Meilisearch实现全站搜索"
                date="2025/06/25"
                category={["技术", "设计"]}
                tags={["search"]}
                cover="https://raw.ravelloh.top/post/image.1ovfmxsmre.webp"
              />
            </GridItem>

            <GridItem areas={[1, 2, 3]} width={4} height={0.4} className="">
              <PostCard
                title="Timepulse：现代化高颜值计时器"
                date="2025/04/03"
                category={["技术", "设计", "文档"]}
                tags={["nextjs", "ui"]}
                cover="https://raw.ravelloh.top/rtheme/categories.webp"
              />
            </GridItem>
            <GridItem areas={[4, 5, 6]} width={4} height={0.4} className="">
              <PostCard
                title="Nextjs使用Server Action实现动态页面重部署"
                date="2025/04/03"
                category={["技术"]}
                tags={["nextjs", "rtheme"]}
                cover="https://raw.ravelloh.top/20250323/image.2obow0upmh.webp"
              />
            </GridItem>
            <GridItem areas={[7, 8, 9]} width={4} height={0.4} className="">
              <PostCard
                title="使用Wireshark进行自我网络安全审计"
                date="2025/02/25"
                category={["技术", "网络安全"]}
                tags={["wireshark"]}
                cover="https://raw.ravelloh.top/20250228/image.86tsfdpaf3.webp"
              />
            </GridItem>
            <GridItem
              areas={[10, 11, 12]}
              width={4}
              height={0.4}
              className="flex items-center uppercase px-10 py-15"
            >
              <div className="block" data-line-reveal>
                <div className="text-4xl">查看全部文章</div>
                <div className="text-2xl">共 1128 篇文章</div>
              </div>
            </GridItem>
          </RowGrid>
          {config.isBlockEnabled(3) && (
            <RowGrid>
              {config.getBlockHeader(3) && (
                <GridItem
                  areas={[1]}
                  width={14}
                  height={0.1}
                  className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
                >
                  <span>{config.getBlockHeader(3)}</span>
                </GridItem>
              )}

              <GridItem
                areas={getBlocksAreas(
                  3,
                  !!config.getBlockHeader(3),
                  !!(
                    config.getBlockFooterLink(3) || config.getBlockFooterDesc(3)
                  ),
                )}
                width={
                  14 /
                  getBlocksAreas(
                    3,
                    !!config.getBlockHeader(3),
                    !!(
                      config.getBlockFooterLink(3) ||
                      config.getBlockFooterDesc(3)
                    ),
                  ).length
                }
                height={1}
                className="px-10 py-15 text-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="text-7xl" data-fade-char>
                    <p>{config.getBlockTitle(3)}</p>
                  </div>
                  <div className="block mt-4" data-line-reveal>
                    {config.getBlockContent(3).map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mt-10">
                    {config.getBlockContent(3, "bottom").map((line, index) => (
                      <div key={index} data-fade-char>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </GridItem>
              {(config.getBlockFooterLink(3) ||
                config.getBlockFooterDesc(3)) && (
                <GridItem
                  areas={[12]}
                  width={14}
                  height={0.1}
                  className="flex items-center uppercase text-2xl"
                >
                  <LinkButton
                    mode="link"
                    href={config.getBlockFooterLink(3)}
                    text={config.getBlockFooterDesc(3)}
                  />
                </GridItem>
              )}
            </RowGrid>
          )}
          <RowGrid>
            <GridItem
              areas={[1, 2, 3, 4, 5]}
              mobileAreas={[1, 2, 3, 4, 5, 6]}
              width={6 / 5}
              className="flex items-center justify-center px-10 text-2xl"
            >
              <div
                className="flex flex-col gap-2 justify-center items-center"
                data-line-reveal
              >
                <Link href="/tags/xxx">
                  <div className=" hover:scale-110 transition-all">
                    #Minecraft x 130
                  </div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#dasdsa x 20</div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#dsadsadqweqw x 13</div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#ewqeqwewqew x 11</div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#Mizxczxcczx x 4</div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#xzczxcraft x 2</div>
                </Link>
                <div>...</div>
              </div>
            </GridItem>
            <GridItem
              areas={[6, 7, 8, 9, 10]}
              mobileAreas={[7, 8, 9, 10, 11, 12]}
              width={6 / 5}
              className="flex items-center justify-center px-10 text-2xl"
            >
              <div
                className="flex flex-col gap-2 justify-center items-center"
                data-line-reveal
              >
                <Link href="/tags/xxx">
                  <div className=" hover:scale-110 transition-all">
                    #Minecraft x 130
                  </div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#dasdsa x 20</div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#dsadsadqweqw x 13</div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#ewqeqwewqew x 11</div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#Mizxczxcczx x 4</div>
                </Link>
                <Link href="/tags/xxx">
                  <div>#xzczxcraft x 2</div>
                </Link>
                <div>...</div>
              </div>
            </GridItem>
            <GridItem
              areas={[11, 12]}
              width={6 / 2}
              height={0.25}
              className="flex items-center justify-center px-10 uppercase text-5xl bg-primary text-primary-foreground"
            >
              <div>
                <div data-fade-char>Tags &</div>
                <div data-fade-char>Categories</div>
              </div>
            </GridItem>
          </RowGrid>
          {config.isBlockEnabled(4) && (
            <RowGrid>
              {config.getBlockHeader(4) && (
                <GridItem
                  areas={[1]}
                  width={14}
                  height={0.1}
                  className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
                >
                  <span>{config.getBlockHeader(4)}</span>
                </GridItem>
              )}

              <GridItem
                areas={getBlocksAreas(
                  4,
                  !!config.getBlockHeader(4),
                  !!(
                    config.getBlockFooterLink(4) || config.getBlockFooterDesc(4)
                  ),
                )}
                width={
                  14 /
                  getBlocksAreas(
                    4,
                    !!config.getBlockHeader(4),
                    !!(
                      config.getBlockFooterLink(4) ||
                      config.getBlockFooterDesc(4)
                    ),
                  ).length
                }
                height={1}
                className="px-10 py-15 text-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="text-7xl" data-fade-char>
                    <p>{config.getBlockTitle(4)}</p>
                  </div>
                  <div className="block mt-4" data-line-reveal>
                    {config.getBlockContent(4).map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mt-10">
                    {config.getBlockContent(4, "bottom").map((line, index) => (
                      <div key={index} data-fade-char>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </GridItem>
              {(config.getBlockFooterLink(4) ||
                config.getBlockFooterDesc(4)) && (
                <GridItem
                  areas={[12]}
                  width={14}
                  height={0.1}
                  className="flex items-center uppercase text-2xl"
                >
                  <LinkButton
                    mode="link"
                    href={config.getBlockFooterLink(4)}
                    text={config.getBlockFooterDesc(4)}
                  />
                </GridItem>
              )}
            </RowGrid>
          )}
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
