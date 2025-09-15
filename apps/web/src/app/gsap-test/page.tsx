import { generateMetadata } from "@/lib/shared/seo";
import GSAPHorizontalScroll from "@/components/GSAPHorizontalScroll";
import FourAreaGrid, { GridItem } from "@/components/FourAreaGrid";

export const metadata = await generateMetadata(
  {
    title: "GSAP 测试页面",
    description: "测试 GSAP 横向滚动实现",
  },
  {
    pathname: "/gsap-test",
  }
);

export default function GSAPTestPage() {
  return (
    <>
      <div className="h-[calc(100vh-156px)]">
        <GSAPHorizontalScroll
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
              <div data-parallax="0.3" data-fade>
                <span>GSAP Home</span>
              </div>
            </GridItem>

            {/* 第二个区域：占据区域2-3，带淡入效果 */}
            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>平滑滚动</span>
              </div>
            </GridItem>

            {/* 第三个区域：占据区域4，带视差效果 */}
            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.8" data-fade>
                <span>GSAP Welcome</span>
              </div>
            </GridItem>

            {/* 第四个区域：占据区域1-2 */}
            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>动画特效</span>
              </div>
            </GridItem>

            {/* 第五个区域：占据区域3-4，带视差 */}
            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.5" data-fade>
                <span>视差滚动</span>
              </div>
            </GridItem>

            {/* 第六个区域：占据所有区域1-4 */}
            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>完整高度</span>
              </div>
            </GridItem>

            {/* 额外的测试区域 */}
            <GridItem
              areas={[1]}
              width="w-80"
              className="bg-pink-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.2" data-fade>
                <span>结尾区域</span>
              </div>
            </GridItem>
            {/* 第一个区域：占据区域1，带视差效果 */}
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div data-parallax="0.3" data-fade>
                <span>GSAP Home</span>
              </div>
            </GridItem>

            {/* 第二个区域：占据区域2-3，带淡入效果 */}
            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>平滑滚动</span>
              </div>
            </GridItem>

            {/* 第三个区域：占据区域4，带视差效果 */}
            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.8" data-fade>
                <span>GSAP Welcome</span>
              </div>
            </GridItem>

            {/* 第四个区域：占据区域1-2 */}
            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>动画特效</span>
              </div>
            </GridItem>

            {/* 第五个区域：占据区域3-4，带视差 */}
            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.5" data-fade>
                <span>视差滚动</span>
              </div>
            </GridItem>

            {/* 第六个区域：占据所有区域1-4 */}
            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>完整高度</span>
              </div>
            </GridItem>

            {/* 额外的测试区域 */}
            <GridItem
              areas={[1]}
              width="w-80"
              className="bg-pink-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.2" data-fade>
                <span>结尾区域</span>
              </div>
            </GridItem>
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div data-parallax="0.3" data-fade>
                <span>GSAP Home</span>
              </div>
            </GridItem>

            {/* 第二个区域：占据区域2-3，带淡入效果 */}
            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>平滑滚动</span>
              </div>
            </GridItem>

            {/* 第三个区域：占据区域4，带视差效果 */}
            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.8" data-fade>
                <span>GSAP Welcome</span>
              </div>
            </GridItem>

            {/* 第四个区域：占据区域1-2 */}
            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>动画特效</span>
              </div>
            </GridItem>

            {/* 第五个区域：占据区域3-4，带视差 */}
            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.5" data-fade>
                <span>视差滚动</span>
              </div>
            </GridItem>

            {/* 第六个区域：占据所有区域1-4 */}
            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>完整高度</span>
              </div>
            </GridItem>

            {/* 额外的测试区域 */}
            <GridItem
              areas={[1]}
              width="w-80"
              className="bg-pink-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.2" data-fade>
                <span>结尾区域</span>
              </div>
            </GridItem>
            {/* 第一个区域：占据区域1，带视差效果 */}
            <GridItem
              areas={[1]}
              width="w-96"
              className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold"
            >
              <div data-parallax="0.3" data-fade>
                <span>GSAP Home</span>
              </div>
            </GridItem>

            {/* 第二个区域：占据区域2-3，带淡入效果 */}
            <GridItem
              areas={[2, 3]}
              width="w-80"
              className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>平滑滚动</span>
              </div>
            </GridItem>

            {/* 第三个区域：占据区域4，带视差效果 */}
            <GridItem
              areas={[4]}
              width="w-72"
              className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.8" data-fade>
                <span>GSAP Welcome</span>
              </div>
            </GridItem>

            {/* 第四个区域：占据区域1-2 */}
            <GridItem
              areas={[1, 2]}
              width="w-64"
              className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-fade>
                <span>动画特效</span>
              </div>
            </GridItem>

            {/* 第五个区域：占据区域3-4，带视差 */}
            <GridItem
              areas={[3, 4]}
              width="w-88"
              className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.5" data-fade>
                <span>视差滚动</span>
              </div>
            </GridItem>

            {/* 第六个区域：占据所有区域1-4 */}
            <GridItem
              areas={[1, 2, 3, 4]}
              width="w-96"
              className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold"
            >
              <div data-fade>
                <span>完整高度</span>
              </div>
            </GridItem>

            {/* 额外的测试区域 */}
            <GridItem
              areas={[1]}
              width="w-80"
              className="bg-pink-500 text-white flex items-center justify-center text-2xl font-bold"
            >
              <div data-parallax="0.2" data-fade>
                <span>结尾区域</span>
              </div>
            </GridItem>
            
          </FourAreaGrid>
        </GSAPHorizontalScroll>
      </div>
    </>
  );
}
