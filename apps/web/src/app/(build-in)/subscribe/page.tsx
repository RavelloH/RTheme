import SubscribeClient from "@/app/(build-in)/subscribe/SubscribeClient";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "订阅中心",
    description: "通过邮箱、通知或 RSS 订阅站点更新",
  },
  { pathname: "/subscribe" },
);

export default function SubscribePage() {
  return <SubscribeClient />;
}
