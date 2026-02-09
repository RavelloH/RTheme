import { getFriendLinkApplyContext } from "@/app/(build-in)/friends/new/apply-context";
import FriendLinkApplyClient from "@/app/(build-in)/friends/new/FriendLinkApplyClient";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "友情链接申请与管理",
    description: "提交、查看、管理你的友情链接申请信息",
    robots: {
      index: false,
      follow: false,
    },
  },
  { pathname: "/friends/new" },
);

export default async function FriendLinkApplyPage() {
  const context = await getFriendLinkApplyContext();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8 md:px-10">
      <div className="mb-4">
        <h1 className="text-3xl font-semibold">友情链接申请与管理</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          在这里提交申请、查看检测统计、编辑或删除你的友链记录。
        </p>
      </div>
      <FriendLinkApplyClient
        currentUser={context.user}
        applyEnabled={context.applyEnabled}
        checkBackLinkEnabled={context.checkBackLinkEnabled}
        siteProfile={context.siteProfile}
        isModal={false}
      />
    </div>
  );
}
