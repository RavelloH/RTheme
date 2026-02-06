"use client";

import { useCallback, useRef } from "react";

import { GalleryTile } from "@/app/(build-in)/gallery/GalleryTile";
import type { Tile } from "@/lib/gallery-layout";
import { useGalleryLightboxStore } from "@/store/gallery-lightbox-store";

interface GalleryListMobileProps {
  tiles: Tile[];
  /** 静态模式：禁用链接、遮罩、放大等所有交互效果 */
  staticMode?: boolean;
}

export default function GalleryListMobile({
  tiles,
  staticMode,
}: GalleryListMobileProps) {
  const setSourceRect = useGalleryLightboxStore((s) => s.setSourceRect);
  const containerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const handleClick = useCallback(
    (tileId: number, imageUrl: string) => {
      const container = containerRefs.current.get(tileId);
      if (container) {
        const rect = container.getBoundingClientRect();
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
    <div className="grid grid-cols-2 grid-flow-dense gap-1 p-1">
      {tiles.map((tile) => {
        let className = "relative overflow-hidden";
        const style: React.CSSProperties = {};

        // Determine spans and aspect ratios based on tile type
        // Assuming grid-cols-2
        switch (tile.type) {
          case "fat":
            className += " col-span-2";
            style.aspectRatio = "2 / 1";
            break;
          case "bigCube4":
            className += " col-span-2";
            style.aspectRatio = "1 / 1";
            break;
          case "tall":
            className += " row-span-2";
            style.aspectRatio = "1 / 2";
            break;
          default:
            // cube
            style.aspectRatio = "1 / 1";
            break;
        }

        return (
          <GalleryTile
            key={tile.id}
            tile={tile}
            onClick={handleClick}
            onRef={(el) => {
              if (el) containerRefs.current.set(tile.id, el);
              else containerRefs.current.delete(tile.id);
            }}
            staticMode={staticMode}
            className={className}
            style={style}
          />
        );
      })}
    </div>
  );
}
