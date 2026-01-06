import "server-only";
import { cookies } from "next/headers";
import { authVerify } from "@/lib/server/auth-verify";
import { getConversations } from "@/actions/message";
import MessagesClient from "@/components/client/MessagesClient";
import UnauthorizedPage from "@/app/unauthorized";
import { generateMetadata } from "@/lib/server/seo";
import ErrorPage from "@/components/ui/Error";

export const metadata = await generateMetadata(
  {
    title: "私信",
    description: "查看和发送私信",
    robots: {
      index: false,
      follow: false,
    },
  },
  { pathname: "/messages" },
);

export default async function MessagesPage() {
  // 检查登录状态
  const cookieStore = await cookies();
  const token = cookieStore.get("ACCESS_TOKEN")?.value;
  const user = await authVerify({
    allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
    accessToken: token,
  });

  if (!user) {
    return <UnauthorizedPage redirect="/messages" />;
  }

  // 获取初始会话列表
  const result = await getConversations(undefined, 0, 20);

  if (!result.success || !result.data) {
    return (
      <ErrorPage
        reason={
          new Error("无法加载会话列表：" + (result.message || "未知错误"))
        }
      />
    );
  }

  const { conversations, hasMore, total } = result.data;

  return (
    <div className="h-full">
      <MessagesClient
        initialConversations={conversations}
        initialTotal={total}
        initialHasMore={hasMore}
        currentUserId={user.uid}
        isModal={false}
      />
    </div>
  );
}
