import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import MenusReport from "./MenusReport";
import MenusTable from "./MenusTable";
import Link from "@/components/Link";
import { ToastProvider } from "@/ui/Toast";

export const metadata = await generateMetadata(
  {
    title: "管理面板/菜单管理",
    description: "管理站点导航菜单",
  },
  {
    pathname: "/admin/menus",
  },
);

export default async function AdminMenus() {
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
          <ToastProvider>
            <MenusReport />
          </ToastProvider>
          <GridItem areas={[9, 10, 11, 12]} width={3} height={0.5} fixedHeight>
            <div className="w-full h-full p-10 flex flex-col justify-between">
              <div>
                <div>
                  在此处管理站点导航菜单，包括主导航、常用链接和外部链接。
                </div>
                <div>你可以通过拖拽调整菜单顺序，也可以批量修改菜单状态。</div>
              </div>
              <div>
                <div>
                  菜单分为三类：MAIN (主导航)、COMMON (常用链接)、OUTSITE
                  (外部链接)。
                </div>
                <div>每个菜单项可以是内部路径 (slug) 或外部链接 (link)。</div>
              </div>
              <div>
                详细设置指南，请参阅文档：
                <Link
                  href="https://docs.ravelloh.com/docs/menus"
                  className="text-primary ml-auto"
                  presets={["hover-underline", "arrow-out"]}
                >
                  https://docs.ravelloh.com/docs/menus
                </Link>
              </div>
            </div>
          </GridItem>
        </RowGrid>
        <RowGrid>
          <ToastProvider>
            <MenusTable />
          </ToastProvider>
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
