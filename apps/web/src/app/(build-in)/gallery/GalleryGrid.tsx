"use client";

import { useCallback, useRef } from "react";

import { GalleryTile } from "@/app/(build-in)/gallery/GalleryTile";
import type { Tile } from "@/lib/gallery-layout";
import { useGalleryLightboxStore } from "@/store/gallery-lightbox-store";

interface GalleryGridProps {
  tiles: Tile[];
}

export default function GalleryGrid({ tiles }: GalleryGridProps) {
  const setSourceRect = useGalleryLightboxStore((s) => s.setSourceRect);
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

        return (
          <GalleryTile
            key={tile.id}
            tile={tile}
            onClick={handleClick}
            onRef={(el) => {
              if (el) containerRefs.current.set(tile.id, el);
              else containerRefs.current.delete(tile.id);
            }}
            style={{
              gridColumn: `span ${colSpan} / span ${colSpan}`,
              gridRow: `span ${rowSpan} / span ${rowSpan}`,
              gridColumnStart: tile.col + 1,
              gridRowStart: tile.row + 1,
            }}
          />
        );
      })}
    </>
  );
}
