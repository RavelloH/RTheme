import PagesReport from "@/app/(admin)/admin/pages/PagesReport";
import PagesTable from "@/app/(admin)/admin/pages/PagesTable";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "管理面板/页面管理",
    description: "管理内置页面与自定义页面",
  },
  {
    pathname: "/admin/pages",
  },
);

export default async function AdminPages() {
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
          <PagesReport />
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5} fixedHeight>
            <div className="w-full h-full p-10 flex flex-col justify-between">
              <div>
                <div>在此处选择系统页面，可自定义其显示文字等。</div>
                <div>
                  你也可以选择自定义开/关区块或页面，以调整页面布局或站点结构。
                </div>
              </div>
              <div>
                <div>
                  也可以在此处创建自定义页面，支持 Markdown、MDX、HTML、BLOCK 与
                  BUILDIN 等内容类型。
                </div>
                <div>在HTML模式下，可自由引入任意内容。</div>
              </div>
              <div>
                详细设置指南，请参阅文档：
                <Link
                  href="https://neutralpress.net/docs/pages"
                  className="text-primary ml-auto"
                  presets={["hover-underline", "arrow-out"]}
                >
                  https://neutralpress.net/docs/pages
                </Link>
              </div>
            </div>
          </GridItem>
        </RowGrid>
        <RowGrid>
          <PagesTable />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
