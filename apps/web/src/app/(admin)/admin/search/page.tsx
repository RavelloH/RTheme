import CustomWordManager from "@/app/(admin)/admin/search/CustomWordManager";
import PostIndexTable from "@/app/(admin)/admin/search/PostIndexTable";
import RebuildAllIndexButton from "@/app/(admin)/admin/search/RebuildAllIndexButton";
import SearchIndexReport from "@/app/(admin)/admin/search/SearchIndexReport";
import TokenizeTest from "@/app/(admin)/admin/search/TokenizeTest";
import WordCloudPanel from "@/app/(admin)/admin/search/WordCloudPanel";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/搜索索引",
    description: "管理搜索分词和文章索引",
  },
  {
    pathname: "/admin/search",
  },
);

export default async function AdminSearch() {
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
          <SearchIndexReport />
          <TokenizeTest />
          <CustomWordManager />
          <RebuildAllIndexButton />
          <WordCloudPanel />
        </RowGrid>
        <RowGrid>
          <PostIndexTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
