"use client";

import CMSImage from "@/components/CMSImage";
import Link from "@/components/Link";
import { useGalleryLightboxStore } from "@/store/gallery-lightbox-store";
import { useCallback, useRef } from "react";
import type { Tile } from "@/lib/gallery-layout";

interface GalleryGridProps {
  tiles: Tile[];
}

export default function GalleryGrid({ tiles }: GalleryGridProps) {
  const setSourceRect = useGalleryLightboxStore((s) => s.setSourceRect);
  const openedPhotoId = useGalleryLightboxStore((s) => s.openedPhotoId);
  // 存储每个图片容器的 ref
  const containerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const handleClick = useCallback(
    (tileId: number, imageUrl: string) => {
      const container = containerRefs.current.get(tileId);
      if (container) {
        const rect = container.getBoundingClientRect();
        // 获取实际渲染的缩略图 URL（包含 Next.js 的图片优化参数）
        const imgElement = container.querySelector("img");
        const actualThumbnailUrl =
          imgElement?.currentSrc || imgElement?.src || imageUrl;

        setSourceRect(
          {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          },
          tileId,
          actualThumbnailUrl,
        );
        // 不在这里隐藏原图，等模态框缩略图渲染后再隐藏
      }
    },
    [setSourceRect],
  );

  return (
    <>
      {tiles.map((tile) => {
        const colSpan = tile.type === "fat" || tile.type === "bigCube4" ? 2 : 1;
        const rowSpan =
          tile.type === "tall" || tile.type === "bigCube4" ? 2 : 1;

        // Skeleton Tile
        if (tile.id < 0) {
          return (
            <div
              key={tile.id}
              className="relative h-full w-full animate-pulse overflow-hidden rounded-sm bg-neutral-200 dark:bg-neutral-800"
              style={{
                gridColumn: `span ${colSpan} / span ${colSpan}`,
                gridRow: `span ${rowSpan} / span ${rowSpan}`,
                gridColumnStart: tile.col + 1,
                gridRowStart: tile.row + 1,
              }}
            />
          );
        }

        const isOpened = openedPhotoId === tile.id;

        return (
          <Link
            key={tile.id}
            href={`/gallery/photo/${tile.slug}`}
            scroll={false}
            onClick={() => handleClick(tile.id, tile.imageUrl)}
            className="group relative flex h-full w-full items-center justify-center overflow-hidden shadow-sm"
            style={{
              gridColumn: `span ${colSpan} / span ${colSpan}`,
              gridRow: `span ${rowSpan} / span ${rowSpan}`,
              gridColumnStart: tile.col + 1,
              gridRowStart: tile.row + 1,
            }}
          >
            <div
              ref={(el) => {
                if (el) containerRefs.current.set(tile.id, el);
              }}
              data-gallery-image={tile.id}
              className="relative h-full w-full overflow-hidden transition-opacity duration-200"
            >
              <CMSImage
                src={tile.imageUrl}
                blur={tile.blur}
                sizes="(max-width: 768px) 14rem, 18rem"
                alt={tile.alt || ""}
                fill
                className={`object-cover transition-transform duration-300 ${
                  isOpened ? "scale-100" : "group-hover:scale-110"
                }`}
              />
              {/* Hover 遮罩层 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              {/* 图片信息 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="text-sm font-medium line-clamp-2">{tile.alt}</p>
                {tile.width && tile.height && (
                  <p className="mt-1 text-xs text-white/80">
                    {tile.width} × {tile.height}
                  </p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
