import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authVerify } from "@/lib/server/auth-verify";
import { getConversations } from "@/actions/message";
import MessagesModal from "./MessagesModal";
import { randomUUID } from "crypto";

export default async function MessagesInterceptPage() {
  // 检查登录状态
  const cookieStore = await cookies();
  const token = cookieStore.get("ACCESS_TOKEN")?.value;
  const user = await authVerify({
    allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
    accessToken: token,
  });

  if (!user) {
    redirect("/login?redirect=/messages");
  }

  // 获取初始会话列表
  const result = await getConversations(undefined, 0, 20);

  if (!result.success || !result.data) {
    return null;
  }

  const { conversations, hasMore, total } = result.data;

  return (
    <MessagesModal
      key={randomUUID()}
      initialConversations={conversations}
      initialTotal={total}
      initialHasMore={hasMore}
      currentUserId={user.uid}
    />
  );
}
