"use client";

import { useMemo } from "react";

import GalleryGrid from "@/app/(build-in)/gallery/GalleryGrid";
import GalleryListMobile from "@/app/(build-in)/gallery/GalleryListMobile";
import type {
  GalleryBlockConfig,
  GalleryData,
} from "@/blocks/collection/Gallery/types";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import ParallaxImageCarousel from "@/components/ui/ParallaxImageCarousel";
import { useMobile } from "@/hooks/use-mobile";
import type { GalleryPhoto } from "@/lib/gallery-layout";
import { GallerySize, generateLayout } from "@/lib/gallery-layout";
import type { ProcessedImageData } from "@/lib/shared/image-common";

// 滤镜类名映射
const FILTER_CLASSES: Record<string, string> = {
  none: "",
  "mix-blend-hue": "mix-blend-hue",
  gray: "grayscale",
  vintage: "sepia brightness-90",
  cinematic: "contrast-125 saturate-75",
};

/**
 * 将 ProcessedImageData 转换为 GalleryPhoto 格式
 */
function toGalleryPhoto(
  image: ProcessedImageData,
  index: number,
): GalleryPhoto {
  return {
    id: index,
    slug: `image-${index}`,
    size: GallerySize.AUTO,
    imageUrl: image.url || "",
    blur: image.blur,
    width: image.width,
    height: image.height,
    alt: `Gallery image ${index + 1}`,
  };
}

/**
 * GalleryBlock - 客户端组件
 * 图片画廊，静态展示模式
 */
export default function GalleryBlock({
  config,
}: {
  config: GalleryBlockConfig;
}) {
  const { content } = config;
  const data = (config.data as GalleryData) || {};
  const isMobile = useMobile();

  // 优先使用处理后的图片数据
  const processedImages: ProcessedImageData[] = data.images || [];
  // 回退到原始图片 URL 数组
  const rawImages: string[] = content.images || [];

  const style = content.layout?.style || "grid";
  const filter = content.layout?.filter || "none";
  const parallaxSpeed = content.layout?.parallaxSpeed ?? -0.6;
  const containerWidth = content.layout?.containerWidth ?? 1 / 3;

  // 使用处理后的图片或原始 URL
  const images =
    processedImages.length > 0
      ? processedImages
      : rawImages.map((url) => ({ url }) as ProcessedImageData);

  // 瀑布流布局：使用 generateLayout 算法
  const masonryTiles = useMemo(() => {
    if (style !== "masonry" || images.length === 0) return [];
    const galleryPhotos = images.map(toGalleryPhoto);
    const { tiles } = generateLayout(galleryPhotos);
    return tiles;
  }, [style, images]);

  if (images.length === 0) {
    return null;
  }

  const filterClass = FILTER_CLASSES[filter] || "";

  // 瀑布流样式：静态展示模式
  if (style === "masonry") {
    // 移动端：使用 GalleryListMobile
    if (isMobile) {
      return (
        <div className="h-full w-full border-muted border">
          <GalleryListMobile tiles={masonryTiles} staticMode />
        </div>
      );
    }

    // 桌面端：使用 GalleryGrid
    return (
      <RowGrid>
        <div className="h-[calc(100vh-10em)] overflow-y-hidden border-muted border">
          <div
            className="relative grid h-full grid-flow-col grid-rows-4 gap-1"
            style={{
              gridAutoColumns: "calc((100cqh - 0.5em - 0.75em) / 4)",
            }}
          >
            <GalleryGrid tiles={masonryTiles} staticMode />
          </div>
        </div>
      </RowGrid>
    );
  }

  // 网格样式：静态展示模式，带视差效果
  return (
    <RowGrid>
      {images.map((image, index) => (
        <GridItem
          key={index}
          areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
          width={containerWidth}
          height={containerWidth}
          fixedHeight
          className="overflow-hidden group"
        >
          <ParallaxImageCarousel
            images={[
              {
                url: image.url || "",
                width: image.width,
                height: image.height,
                blur: image.blur,
              },
            ]}
            alt={`Gallery image ${index + 1}`}
            parallaxSpeed={parallaxSpeed}
            className={`!opacity-100 ${filterClass}`}
          />
        </GridItem>
      ))}
    </RowGrid>
  );
}
