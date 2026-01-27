import { generateMetadata } from "@/lib/server/seo";
import HorizontalScroll from "@/components/HorizontalScroll";
import RowGrid, { GridItem } from "@/components/RowGrid";
import MainLayout from "@/components/MainLayout";
import RegisterSheet from "./RegisterSheet";
import Marquee from "react-fast-marquee";
import RegisterIntro from "./RegisterIntro";
import { getConfig } from "@/lib/server/config-cache";
import type { OAuthProvider } from "@/lib/server/oauth";

export const metadata = await generateMetadata(
  {
    title: "注册 / Register",
    description: "在此站点注册个人账户，以便访问更多功能。",
  },
  {
    pathname: "/register",
  },
);

async function getEnabledSSOProviders(): Promise<OAuthProvider[]> {
  const providers: OAuthProvider[] = ["google", "github", "microsoft"];
  const enabled: OAuthProvider[] = [];

  for (const provider of providers) {
    const isEnabled = await getConfig(`user.sso.${provider}.enabled`);
    if (isEnabled) {
      enabled.push(provider);
    }
  }

  return enabled;
}

export default async function RegisterPage() {
  const [canRegister, isNeedEmailVerify, enabledSSOProviders] =
    await Promise.all([
      getConfig("user.registration.enabled"),
      getConfig("user.email.verification.required"),
      getEnabledSSOProviders(),
    ]);

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
              <h1>Register / 注册</h1>
            </GridItem>
            <GridItem
              areas={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
              width={14 / 11}
              height={1}
              className="flex flex-col items-center justify-center text-center p-15"
            >
              <RegisterSheet
                canRegister={canRegister}
                emailVerificationRequired={isNeedEmailVerify}
                enabledSSOProviders={enabledSSOProviders}
              />
            </GridItem>

            <GridItem
              areas={[1, 2, 3, 4]}
              width={4}
              className="flex items-center"
              height={0.3}
            >
              <Marquee className="text-7xl h-full" speed={30} autoFill>
                <span>Register</span>
                <span className="px-4">/</span>
                <span>注册</span>
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
                <RegisterIntro
                  canRegister={canRegister}
                  isNeedEmailVerify={isNeedEmailVerify}
                />
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
