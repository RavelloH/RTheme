import "server-only";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authVerify } from "@/lib/server/auth-verify";
import { getNotices } from "@/actions/notice";
import NotificationsModal from "./NotificationsModal";

export default async function NotificationsInterceptPage() {
  // 检查登录状态
  const cookieStore = await cookies();
  const token = cookieStore.get("ACCESS_TOKEN")?.value;
  const user = await authVerify({
    allowedRoles: ["USER", "ADMIN", "EDITOR", "AUTHOR"],
    accessToken: token,
  });
  if (!user) {
    redirect("/login?redirect=/notifications");
  }

  // 获取通知数据
  const result = await getNotices();

  if (!result.success || !result.data) {
    return null;
  }

  const { unread, read } = result.data;

  return <NotificationsModal unreadNotices={unread} readNotices={read} />;
}
