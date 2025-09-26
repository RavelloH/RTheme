import { generateMetadata } from "@/lib/shared/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import MainLayout from "@/components/MainLayout";
import RegisterSheet from "@/components/RegisterSheet";

export const metadata = await generateMetadata(
  {
    title: "注册 / Register",
    description: "在此站点注册个人账户，以便访问更多功能。",
  },
  {
    pathname: "/register",
  },
);

export default function TestPage() {
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
              areas={[1]}
              width={14}
              className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl"
            >
              <h1>Register / 注册</h1>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              width={14 / 11}
              className="flex flex-col items-center justify-center text-center p-15"
            >
              <RegisterSheet />
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
