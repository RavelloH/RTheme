import { generateMetadata } from "@/lib/server/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import MainLayout from "@/components/MainLayout";
import Marquee from "react-fast-marquee";
import LoginSheet from "./LoginSheet";
import { Suspense } from "react";

export const metadata = await generateMetadata(
  {
    title: "登录 / Login",
    description: "登录到你的个人账户，以激活云同步，以及访问更多功能。",
  },
  {
    pathname: "/login",
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
              height={0.1}
              className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl"
            >
              <h1>Login / 登录</h1>
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
                <LoginSheet />
              </Suspense>
            </GridItem>

            <GridItem
              areas={[1, 2, 3, 4]}
              width={4}
              height={0.3}
              className="flex items-center"
            >
              <Marquee className="text-7xl h-full" speed={30} autoFill>
                <span>Login</span>
                <span className="px-4">/</span>
                <span>登录</span>
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
                <div>在单个设备上，最多可保持登录30天。</div>
                <div>你可在账户设置页面随时撤销其他会话的登陆状态。</div>
              </div>
            </GridItem>
            <GridItem
              areas={[9, 10, 11, 12]}
              width={4}
              height={0.4}
              className="flex items-center px-10 text-2xl"
            >
              <div>
                <div>
                  我们使用现代加密算法 Argon2id
                  以单向加盐的方式不可逆的处理密码，
                </div>
                <div>
                  并对输入的密码进行乱序重组预处理，以保证你的账号安全。
                </div>
                <div>这意味着任何人都无法获取你的密码明文。</div>
              </div>
            </GridItem>
          </RowGrid>
        </HorizontalScroll>
      </MainLayout>
    </>
  );
}
