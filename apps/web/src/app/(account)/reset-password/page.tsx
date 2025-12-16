import { generateMetadata } from "@/lib/server/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import MainLayout from "@/components/MainLayout";
import Marquee from "react-fast-marquee";
import ResetPasswordSheet from "./ResetPasswordSheet";
import { Suspense } from "react";

export const metadata = await generateMetadata(
  {
    title: "重置密码 / Reset Password",
    description: "重置您的账户密码。",
  },
  {
    pathname: "/reset-password",
  },
);

export default function ResetPasswordPage() {
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
              height={0.1}
              className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl"
            >
              <h1>Reset Password / 重置密码</h1>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              width={14 / 11}
              height={1}
              className="flex flex-col items-center justify-center text-center p-15"
            >
              <Suspense
                fallback={
                  <div className="text-muted-foreground">加载中...</div>
                }
              >
                <ResetPasswordSheet />
              </Suspense>
            </GridItem>

            <GridItem
              areas={[1, 2, 3, 4]}
              width={4}
              height={0.3}
              className="flex items-center"
            >
              <Marquee className="text-7xl h-full" speed={30} autoFill>
                <span>Reset</span>
                <span className="px-4">/</span>
                <span>重置</span>
                <span className="px-4">/</span>
              </Marquee>
            </GridItem>
            <GridItem
              areas={[5, 6, 7, 8]}
              width={4}
              height={0.4}
              className="flex items-center px-10 text-2xl"
            >
              <div>
                <div>如果您忘记了密码，请输入您的邮箱地址。</div>
                <div>我们将向您发送密码重置链接。</div>
              </div>
            </GridItem>
            <GridItem
              areas={[9, 10, 11, 12]}
              width={4}
              height={0.4}
              className="flex items-center px-10 text-2xl"
            >
              <div>
                <div>重置链接有效期为30分钟。</div>
                <div>请在有效期内完成密码重置。</div>
              </div>
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
