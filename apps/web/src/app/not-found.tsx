import { generateMetadata } from "@/lib/shared/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import MainLayout from "@/components/MainLayout";

export const metadata = await generateMetadata(
  {
    title: "404 Not Found",
    description:
      "在服务器中未找到此页面。这可能代表此页面已被删除、移动，或从未存在过。",
  },
  {
    pathname: "/404",
  },
);

export default function Custom404() {
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
            <GridItem
              areas={[1, 2, 3, 4, 5, 6]}
              absoluteWidth="100%"
              className="flex flex-col items-center justify-center text-center p-15"
            >
              <div className="text-9xl font-bold mb-4" data-fade-char>
                404
              </div>
              <div className="text-4xl mb-8" data-fade-word>
                页面未找到
              </div>
              <div
                className="text-2xl text-muted-foreground mb-12"
                data-line-reveal
              >
                <div>您访问的页面可能已被删除、移动，</div>
                <div>或者从未存在过。</div>
              </div>
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
