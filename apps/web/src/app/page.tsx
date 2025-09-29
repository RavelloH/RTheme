import { generateMetadata } from "@/lib/shared/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import ParallaxImageCarousel from "@/components/ParallaxImageCarousel";
import Marquee from "react-fast-marquee";
import Link from "@/components/Link";
import PostCard from "@/components/PostCard";
import MainLayout from "@/components/MainLayout";
import HomeTitle from "./home/HomeTitle";
import HomeSlogan from "./home/HomeSlogan";

export const metadata = await generateMetadata(
  {
    title: "首页",
    description: "欢迎访问我们的网站",
  },
  {
    pathname: "/",
  },
);

export default function Home() {
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
            <GridItem
              areas={[1]}
              width={14}
              height={0.1}
              className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
            >
              <span>Welcome. I&apos;m...</span>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
              width={1.4}
              height={1}
              className="px-10 py-15 text-2xl flex flex-col justify-between"
            >
              <div>
                <div className="text-7xl" data-fade-char>
                  <p>
                    RavelloH \ <wbr /> 拉韦洛
                  </p>
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
              height={0.1}
              className="flex items-center uppercase px-10 text-2xl"
            >
              <span data-fade-word>Learn more about me</span>
            </GridItem>
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={2}
              className="overflow-hidden block relative"
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
              className="flex items-center px-10 text-2xl bg-primary text-primary-foreground uppercase"
            >
              <span data-fade-word>My main tech stack includes</span>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6]}
              width={12 / 5}
              className="flex items-center px-10 py-15"
            >
              <div className="text-2xl block">
                <div data-fade-word>
                  Next.js / React / TailwindCSS / Serverless / Node.js / NPM /
                  TypeScript / Express.js / MongoDB / PostgreSQL / Redis /
                  Docker / Kubernetes / GraphQL / REST / API / Webpack / Vite /
                  Jest / Cypress ...
                </div>
              </div>
            </GridItem>

            <GridItem
              areas={[7, 8, 9, 10, 11, 12]}
              width={2}
              className="overflow-hidden block relative"
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
              className="overflow-hidden block relative"
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
              className="flex items-center px-10 py-15"
            >
              <div className="text-2xl block" data-line-reveal>
                <div>不止这些。</div>
                <div>想要查看更多？</div>
                <div>前往我的 Github 来查看我的所有项目，</div>
                <div>或者在 Projects 页面看看相关描述。</div>
                <br />
                <div data-fade>
                  Github:
                  <Link
                    href="https://github.com/RavelloH"
                    className="underline"
                  >
                    @RavelloH
                  </Link>
                </div>
              </div>
            </GridItem>
            <GridItem
              areas={[12]}
              width={12}
              height={0.1}
              className="flex items-center px-10 text-2xl"
            >
              <span data-fade-word className="uppercase ">
                View more projects
              </span>
            </GridItem>

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

            <GridItem
              areas={[1]}
              width={14}
              height={0.1}
              className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl"
            >
              <span>Want to...</span>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
              width={1.4}
              height={1}
              className="px-10 py-15 text-2xl flex flex-col justify-between"
            >
              <div>
                <div className="text-7xl" data-fade-char>
                  Contact me / 联系我
                </div>
                <div className="block mt-4" data-line-reveal>
                  <div>学习交流?</div>
                  <div>洽谈合作?</div>
                  <div>交个朋友?</div>
                  <div>......</div>
                  <div>欢迎通过邮箱联系我：</div>
                  <div>
                    <Link href="mailto:me@ravelloh.com">me@ravelloh.com</Link>
                  </div>
                </div>
              </div>
              <div>
                <div className="mt-10">
                  <div data-fade-char>或者，不用那么正式，</div>
                  <div data-fade-char>直接使用下方的站内信系统和我聊聊。</div>
                </div>
              </div>
            </GridItem>
            <GridItem
              areas={[12]}
              width={14}
              height={0.1}
              className="flex items-center uppercase px-10 text-2xl"
            >
              <span data-fade-word>Start chatting with me</span>
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
