import "server-only";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authVerify } from "@/lib/server/auth-verify";
import { getNotices } from "@/actions/notice";
import NotificationsClient from "./NotificationsClient";

export const metadata: Metadata = {
  title: "通知中心",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NotificationsPage() {
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">加载通知失败</p>
      </div>
    );
  }

  const { unread, read, hasMoreRead, total, unreadCount } = result.data;
  const totalReadCount = total - unreadCount; // 计算已读通知总数

  return (
    <NotificationsClient
      unreadNotices={unread}
      readNotices={read}
      totalReadCount={totalReadCount}
      isModal={false}
      hasMoreRead={hasMoreRead}
    />
  );
}
