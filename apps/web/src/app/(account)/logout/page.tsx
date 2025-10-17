import { generateMetadata } from "@/lib/shared/seo";
import MainLayout from "@/components/MainLayout";
import LogoutSheet from "./LogoutSheet";

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
