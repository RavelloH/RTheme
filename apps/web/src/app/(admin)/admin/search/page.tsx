import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import TokenizeTest from "./TokenizeTest";
import CustomWordManager from "./CustomWordManager";
import PostIndexTable from "./PostIndexTable";
import SearchIndexReport from "./SearchIndexReport";
import WordCloudPanel from "./WordCloudPanel";
import RebuildAllIndexButton from "./RebuildAllIndexButton";

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
