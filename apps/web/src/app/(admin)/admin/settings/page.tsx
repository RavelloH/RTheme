import HorizontalScroll from "@/components/HorizontalScroll";
import MainLayout from "@/components/MainLayout";
import RowGrid from "@/components/RowGrid";
import { generateMetadata } from "@/lib/server/seo";
import AdminSidebar from "@/components/AdminSidebar";
import SettingsInfo from "./SettingsInfo";
import SettingSelect from "./SettingsSelect";
import SettingSheet from "./SettingsSheet";

export const metadata = await generateMetadata(
  {
    title: "管理面板/设置",
    description: "设置站点配置信息",
  },
  {
    pathname: "/admin/settings",
  },
);

export default function AuditLogsPage() {
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
          <SettingsInfo />
          <SettingSelect />
        </RowGrid>
        <RowGrid>
          <SettingSheet />
        </RowGrid>
      </HorizontalScroll>
    </MainLayout>
  );
}
