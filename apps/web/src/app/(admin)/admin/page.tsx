import AdminRedirect from "@/app/(admin)/admin/Redirect";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板",
    description: "管理你的文章，页面，用户和设置",
  },
  {
    pathname: "/admin",
  },
);

export default function AdminRouter() {
  return <AdminRedirect />;
}
