import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import StoragesInfo from "./StoragesInfo";
import StoragesTable from "./StoragesTable";
import Link from "@/components/Link";
import StoragesAdd from "./StoragesAdd";

export const metadata = await generateMetadata(
  {
    title: "管理面板/存储管理",
    description: "管理存储提供商和文件存储配置",
  },
  {
    pathname: "/admin/storages",
  },
);

export default async function AdminStorages() {
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
          <StoragesInfo />
          <StoragesAdd />
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5} fixedHeight>
            <div className="w-full h-full p-10 flex flex-col justify-between">
              <div>
                <div>在此处管理存储提供商，支持本地存储和云存储服务。</div>
                <div>
                  你可以配置多种存储类型，包括本地存储、AWS S3、GitHub Pages
                  等。
                </div>
              </div>
              <div>
                <div>支持设置默认存储，文件上传时将优先使用默认存储。</div>
                <div>可以为每个存储设置文件大小限制和路径模板。</div>
              </div>
              <div>
                详细配置指南，请参阅文档：
                <Link
                  href="https://docs.ravelloh.com/docs/storage"
                  className="text-primary ml-auto"
                  presets={["hover-underline", "arrow-out"]}
                >
                  https://docs.ravelloh.com/docs/storage
                </Link>
              </div>
            </div>
          </GridItem>
        </RowGrid>
        <RowGrid>
          <StoragesTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
