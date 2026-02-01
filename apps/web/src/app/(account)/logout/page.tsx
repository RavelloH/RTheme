import LogoutSheet from "@/app/(account)/logout/LogoutSheet";
import MainLayout from "@/components/client/layout/MainLayout";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "退出登录 / Logout",
    description: "退出此站点的全部登录状态。",
    robots: {
      index: false,
    },
  },
  {
    pathname: "/logout",
  },
);

export default function TestPage() {
  return (
    <>
      <MainLayout type="horizontal">
        <LogoutSheet />
      </MainLayout>
    </>
  );
}
