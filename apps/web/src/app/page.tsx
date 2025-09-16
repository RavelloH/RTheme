import { generateMetadata } from "@/lib/shared/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import Image from "next/image";

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
          snapToElements={false}
        >
          <RowGrid>
            {/* 主页介绍区域 */}
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              width={4.5}
              fontScale={0.08}
              className="flex items-center justify-center font-bold"
            >
              轮播图
            </GridItem>
            <GridItem
              areas={[7, 8, 9]}
              width={9}
              fontScale={0.4}
              className="flex items-center font-bold p-12"
            >
              <div data-fade data-parallax="-0.6">
                <span>RavelloH&apos;s Blog</span>
              </div>
            </GridItem>
            <GridItem
              areas={[10, 11, 12]}
              width={9}
              fontScale={0.4}
              className=" flex items-center justify-start font-bold"
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
                className="flex-1 flex items-center justify-end pr-12"
                data-fade
              >
                <span data-parallax="0.5">Beginning of meditation.</span>
              </div>
            </GridItem>
            <GridItem
              areas={[1]}
              width={14}
              fontScale={0.3}
              className="bg-primary text-primary-foreground flex items-center px-10 uppercase"
            >
              Welcome to 
            </GridItem>

            <GridItem
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
              width={1.4}
              fontScale={0.08}
              className="flex items-center justify-center font-bold px-10"
            >
              <div className="w-192">
                <span>Home</span>
              </div>
              <div className="w-192">
                <span>Home</span>
              </div>
            </GridItem>
            <GridItem
              areas={[12]}
              width={14}
              fontScale={0.3}
              className="flex items-center uppercase px-10"
            >
              Learn more
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </div>
    </>
  );
}
