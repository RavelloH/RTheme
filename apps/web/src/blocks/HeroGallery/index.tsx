import RowGrid, { GridItem } from "@/components/RowGrid";
import HomeImageGallery from "./client/HomeImageGallery";
import GlobalMouseTracker from "./client/GlobalMouseTracker";
import HomeTextSection from "./client/HomeTextSection";
import type { BlockConfig } from "@/blocks/types";

interface HeroData {
  galleryImages: string[];
  siteTitle: string;
  siteSlogan: string;
}

/**
 * HeroBlock - 服务端组件
 * 布局结构，文本内容由客户端组件根据设备类型动态渲染
 */
export default function HeroBlock({ config }: { config: BlockConfig }) {
  const data = (config.data as HeroData) || {};
  const { galleryImages, siteTitle, siteSlogan } = data;

  return (
    <RowGrid>
      {/* 图片画廊区域 + 全局鼠标追踪 */}
      <GridItem
        areas={[1, 2, 3, 4, 5, 6]}
        width={4.5}
        height={0.5}
        className="flex items-center justify-center"
      >
        <HomeImageGallery images={galleryImages || []} />
        <GlobalMouseTracker />
      </GridItem>

      {/* 标题和标语区域 - 由客户端组件根据设备类型渲染 */}
      <HomeTextSection title={siteTitle} slogan={siteSlogan} />
    </RowGrid>
  );
}
