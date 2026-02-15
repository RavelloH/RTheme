import MailSubscriptionDispatchPanel from "@/app/(admin)/admin/mail-subscriptions/MailSubscriptionDispatchPanel";
import MailSubscriptionTable from "@/app/(admin)/admin/mail-subscriptions/MailSubscriptionTable";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/邮件订阅",
    description: "管理最新文章的邮件订阅分发",
  },
  {
    pathname: "/admin/mail-subscriptions",
  },
);

export default async function AdminMailSubscriptionsPage() {
  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax={true}
        enableFadeElements={true}
        enableLineReveal={true}
        snapToElements={false}
      >
        <AdminSidebar />
        <RowGrid>
          <MailSubscriptionDispatchPanel />
        </RowGrid>
        <RowGrid>
          <MailSubscriptionTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
