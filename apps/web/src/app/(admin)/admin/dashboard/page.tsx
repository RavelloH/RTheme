import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid, { GridItem } from "@/components/RowGrid";
import { generateMetadata } from "@/lib/shared/seo";
import DashboardDoctor from "./DashboardDoctor";

export const metadata = await generateMetadata(
  {
    title: "管理面板/仪表盘",
    description: "快速查看站点当前状态",
  },
  {
    pathname: "/admin/dashboard",
  },
);

export default function AdminDashboard() {
  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax={true}
        enableFadeElements={true}
        enableLineReveal={true}
        snapToElements={false}
      >
        <RowGrid>
          <GridItem areas={[1, 2, 3, 4]} width={3} height={0.5}>
            <DashboardDoctor />
          </GridItem>
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
