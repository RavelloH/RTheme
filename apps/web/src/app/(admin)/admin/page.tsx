import { generateMetadata } from "@/lib/shared/seo";
import AdminRedirect from "./Redirect";

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
