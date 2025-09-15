import { generateMetadata } from "@/lib/shared/seo";
import HorizontalScrollLayout from "@/components/HorizontalScrollLayout";
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
        <HorizontalScrollLayout className="h-full">
          <FourAreaGrid>
            {/* 第一个区域：占据区域1，显示Home */}
            <GridItem areas={[1]} width="w-96" className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold">
              <span>Home</span>
            </GridItem>
            
            {/* 第二个区域：占据区域2-3，显示主页 */}
            <GridItem areas={[2, 3]} width="w-80" className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold">
              <span>主页</span>
            </GridItem>
            
            {/* 第三个区域：占据区域4，显示Welcome */}
            <GridItem areas={[4]} width="w-72" className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold">
              <span>Welcome</span>
            </GridItem>
            
            {/* 第四个区域：占据区域1-2，显示Feature */}
            <GridItem areas={[1, 2]} width="w-64" className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold">
              <span>Feature</span>
            </GridItem>
            
            {/* 第五个区域：占据区域3-4，显示About */}
            <GridItem areas={[3, 4]} width="w-88" className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold">
              <span>About</span>
            </GridItem>
            
            {/* 第六个区域：占据所有区域1-4，显示Full */}
            <GridItem areas={[1, 2, 3, 4]} width="w-96" className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold">
              <span>Full Height</span>
            </GridItem>
             {/* 第一个区域：占据区域1，显示Home */}
            <GridItem areas={[1]} width="w-96" className="bg-blue-500 text-white flex items-center justify-center text-4xl font-bold">
              <span>Home</span>
            </GridItem>
            
            {/* 第二个区域：占据区域2-3，显示主页 */}
            <GridItem areas={[2, 3]} width="w-80" className="bg-green-500 text-white flex items-center justify-center text-3xl font-bold">
              <span>主页</span>
            </GridItem>
            
            {/* 第三个区域：占据区域4，显示Welcome */}
            <GridItem areas={[4]} width="w-72" className="bg-purple-500 text-white flex items-center justify-center text-2xl font-bold">
              <span>Welcome</span>
            </GridItem>
            
            {/* 第四个区域：占据区域1-2，显示Feature */}
            <GridItem areas={[1, 2]} width="w-64" className="bg-red-500 text-white flex items-center justify-center text-2xl font-bold">
              <span>Feature</span>
            </GridItem>
            
            {/* 第五个区域：占据区域3-4，显示About */}
            <GridItem areas={[3, 4]} width="w-88" className="bg-yellow-500 text-black flex items-center justify-center text-2xl font-bold">
              <span>About</span>
            </GridItem>
            
            {/* 第六个区域：占据所有区域1-4，显示Full */}
            <GridItem areas={[1, 2, 3, 4]} width="w-96" className="bg-indigo-500 text-white flex items-center justify-center text-3xl font-bold">
              <span>Full Height</span>
            </GridItem>
          </FourAreaGrid>
        </HorizontalScrollLayout>
      </div>
    </>
  );
}
