import BackupsDryRunResult from "@/app/(admin)/admin/backups/BackupsDryRunResult";
import BackupsInfo from "@/app/(admin)/admin/backups/BackupsInfo";
import BackupsPanel from "@/app/(admin)/admin/backups/BackupsPanel";
import AdminSidebar from "@/components/client/layout/AdminSidebar";
import HorizontalScroll from "@/components/client/layout/HorizontalScroll";
import MainLayout from "@/components/client/layout/MainLayout";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import { generateMetadata } from "@/lib/server/seo";

const FULL_AREAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const metadata = await generateMetadata(
  {
    title: "管理面板/备份还原",
    description: "按分组执行数据库备份与还原，支持 dry-run 预检",
  },
  {
    pathname: "/admin/backups",
  },
);

export default function AdminBackupsPage() {
  return (
    <MainLayout type="horizontal">
      <HorizontalScroll
        className="h-full"
        enableParallax
        enableFadeElements
        enableLineReveal
        snapToElements={false}
      >
        <AdminSidebar />
        <RowGrid>
          <BackupsInfo />
          <BackupsPanel />
        </RowGrid>
        <RowGrid>
          <GridItem areas={[...FULL_AREAS]} width={1.5} height={0.8}>
            <BackupsDryRunResult />
          </GridItem>
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
