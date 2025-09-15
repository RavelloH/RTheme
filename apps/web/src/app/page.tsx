import { generateMetadata } from "@/lib/shared/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import FourAreaGrid, { GridItem } from "@/components/FourAreaGrid";

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
          <FourAreaGrid>
            {/* 第一个区域：占据区域1，带视差效果 */}
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div data-fade>
                <span>Home</span>
              </div>
            </GridItem>

            {/* 第二个区域：占据区域2-3，带淡入效果 */}
            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>主页</span>
              </div>
            </GridItem>

            {/* 第三个区域：占据区域4，带视差效果 */}
            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Welcome</span>
              </div>
            </GridItem>

            {/* 第四个区域：占据区域1-2 */}
            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Feature</span>
              </div>
            </GridItem>

            {/* 第五个区域：占据区域3-4，带视差 */}
            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div  data-fade>
                <span>About</span>
              </div>
            </GridItem>

            {/* 第六个区域：占据所有区域1-4 */}
            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>Full Height</span>
              </div>
            </GridItem>

            {/* 第二组重复内容 */}
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div  data-fade>
                <span>Home</span>
              </div>
            </GridItem>

            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>主页</span>
              </div>
            </GridItem>

            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
              data-fade
            >
              <div data-fade>
                <span>Welcome</span>
              </div>
            </GridItem>

            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Feature</span>
              </div>
            </GridItem>

            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>About</span>
              </div>
            </GridItem>

            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>Full Height</span>
              </div>
            </GridItem>
             {/* 第一个区域：占据区域1，带视差效果 */}
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div data-fade>
                <span>Home</span>
              </div>
            </GridItem>

            {/* 第二个区域：占据区域2-3，带淡入效果 */}
            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>主页</span>
              </div>
            </GridItem>

            {/* 第三个区域：占据区域4，带视差效果 */}
            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Welcome</span>
              </div>
            </GridItem>

            {/* 第四个区域：占据区域1-2 */}
            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Feature</span>
              </div>
            </GridItem>

            {/* 第五个区域：占据区域3-4，带视差 */}
            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div  data-fade>
                <span>About</span>
              </div>
            </GridItem>

            {/* 第六个区域：占据所有区域1-4 */}
            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>Full Height</span>
              </div>
            </GridItem>

            {/* 第二组重复内容 */}
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div  data-fade>
                <span>Home</span>
              </div>
            </GridItem>

            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>主页</span>
              </div>
            </GridItem>

            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
              data-fade
            >
              <div data-fade>
                <span>Welcome</span>
              </div>
            </GridItem>

            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Feature</span>
              </div>
            </GridItem>

            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>About</span>
              </div>
            </GridItem>

            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>Full Height</span>
              </div>
            </GridItem>
             {/* 第一个区域：占据区域1，带视差效果 */}
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div data-fade>
                <span>Home</span>
              </div>
            </GridItem>

            {/* 第二个区域：占据区域2-3，带淡入效果 */}
            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>主页</span>
              </div>
            </GridItem>

            {/* 第三个区域：占据区域4，带视差效果 */}
            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Welcome</span>
              </div>
            </GridItem>

            {/* 第四个区域：占据区域1-2 */}
            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Feature</span>
              </div>
            </GridItem>

            {/* 第五个区域：占据区域3-4，带视差 */}
            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div  data-fade>
                <span>About</span>
              </div>
            </GridItem>

            {/* 第六个区域：占据所有区域1-4 */}
            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>Full Height</span>
              </div>
            </GridItem>

            {/* 第二组重复内容 */}
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div  data-fade>
                <span>Home</span>
              </div>
            </GridItem>

            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>主页</span>
              </div>
            </GridItem>

            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
              data-fade
            >
              <div data-fade>
                <span>Welcome</span>
              </div>
            </GridItem>

            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>Feature</span>
              </div>
            </GridItem>

            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>About</span>
              </div>
            </GridItem>

            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>Full Height</span>
              </div>
            </GridItem>
          </FourAreaGrid>
        </HorizontalScroll>
      </div>
    </>
  );
}
