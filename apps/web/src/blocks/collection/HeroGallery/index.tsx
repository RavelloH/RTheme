import GlobalMouseTracker from "@/blocks/collection/HeroGallery/client/GlobalMouseTracker";
import HomeImageGallery from "@/blocks/collection/HeroGallery/client/HomeImageGallery";
import HomeTextSection from "@/blocks/collection/HeroGallery/client/HomeTextSection";
import type { HeroData } from "@/blocks/collection/HeroGallery/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { replacePlaceholders as replaceFn } from "@/blocks/core/lib";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";

interface HeroContent {
  line1?: { value?: string; bold?: boolean };
  line2?: { value?: string; bold?: boolean };
  galleryImageFilter?: string;
  [key: string]: unknown;
}

/**
 * HeroBlock - 服务端组件
 * 布局结构，文本内容由客户端组件根据设备类型动态渲染
 */
export default function HeroBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<HeroData>(block.runtime);
  const content = (block.content as HeroContent) || {};
  const { galleryImages, siteTitle, siteSlogan, logoImage } = data;
  const { line1, line2, galleryImageFilter } = content;

  // 替换占位符
  const replacePlaceholders = (text: string): string => {
    return replaceFn(text, data);
  };

  // 优先使用自定义字段，否则使用默认值
  const title = line1?.value || siteTitle || "";
  const slogan = line2?.value || siteSlogan || "";
  const titleBold = line1?.bold ?? true;
  const sloganBold = line2?.bold ?? false;

  return (
    <RowGrid>
      {/* 图片画廊区域 + 全局鼠标追踪 */}
      <GridItem
        areas={[1, 2, 3, 4, 5, 6]}
        width={4.5}
        height={0.5}
        className="flex items-center justify-center"
      >
        <HomeImageGallery
          images={galleryImages || []}
          filter={
            (galleryImageFilter as
              | "none"
              | "mix-blend-hue"
              | "dark"
              | "gray"
              | "warm"
              | "cool"
              | "vintage"
              | "contrast"
              | "sepia"
              | "saturate"
              | "film"
              | "dramatic"
              | "soft"
              | "fade"
              | "cinematic"
              | "noire"
              | "bloom"
              | "inverted"
              | "duotone") || "mix-blend-hue"
          }
        />
        <GlobalMouseTracker />
      </GridItem>

      {/* 标题和标语区域 - 由客户端组件根据设备类型渲染 */}
      <HomeTextSection
        title={replacePlaceholders(title)}
        slogan={replacePlaceholders(slogan)}
        titleBold={titleBold}
        sloganBold={sloganBold}
        logoImage={logoImage}
      />
    </RowGrid>
  );
}
