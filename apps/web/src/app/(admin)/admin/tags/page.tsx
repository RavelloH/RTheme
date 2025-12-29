import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import TagsReport from "./TagsReport";
import TagsDistributionChart from "./TagsDistributionChart";
import TagsTable from "./TagsTable";
import { getConfig } from "@/lib/server/config-cache";

export const metadata = await generateMetadata(
  {
    title: "管理面板/标签管理",
    description: "查看和管理标签",
  },
  {
    pathname: "/admin/tags",
  },
);

export default async function AdminTags() {
  const mainColor = (await getConfig<{ primary: string }>("site.color"))
    .primary;
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
          <TagsReport />
          <TagsDistributionChart mainColor={mainColor} />
        </RowGrid>
        <RowGrid>
          <TagsTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
