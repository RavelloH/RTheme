import StoragesAdd from "@/app/(admin)/admin/storages/StoragesAdd";
import StoragesInfo from "@/app/(admin)/admin/storages/StoragesInfo";
import StoragesTable from "@/app/(admin)/admin/storages/StoragesTable";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";
import { generateMetadata } from "@/lib/server/seo";

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
                  href="https://neutralpress.net/docs/settings/storage"
                  className="text-primary ml-auto"
                  presets={["hover-underline", "arrow-out"]}
                >
                  https://neutralpress.net/docs/settings/storage
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
