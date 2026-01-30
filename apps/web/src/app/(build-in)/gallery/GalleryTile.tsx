"use client";

import CMSImage from "@/components/CMSImage";
import Link from "next/link";
import { useGalleryLightboxStore } from "@/store/gallery-lightbox-store";
import type { Tile } from "@/lib/gallery-layout";
import { memo } from "react";

interface GalleryTileProps {
  tile: Tile;
  onClick: (tileId: number, imageUrl: string) => void;
  // Using a callback ref pattern or just passing the ref
  onRef: (el: HTMLDivElement | null) => void;
  style?: React.CSSProperties;
  className?: string;
  priority?: boolean;
}

function GalleryTileComponent({
  tile,
  onClick,
  onRef,
  style,
  className,
  priority = false,
}: GalleryTileProps) {
  const openedPhotoId = useGalleryLightboxStore((s) => s.openedPhotoId);

  // Skeleton Tile
  if (tile.id < 0) {
    return (
      <div
        className={`relative h-full w-full animate-pulse overflow-hidden bg-neutral-200 dark:bg-neutral-800 ${
          className || ""
        }`}
        style={style}
      />
    );
  }

  const isOpened = openedPhotoId === tile.id;

  return (
    <Link
      href={`/gallery/photo/${tile.slug}`}
      scroll={false}
      onClick={() => onClick(tile.id, tile.imageUrl)}
      className={`group relative flex h-full w-full items-center justify-center overflow-hidden shadow-sm ${
        className || ""
      }`}
      style={style}
    >
      <div
        ref={onRef}
        data-gallery-image={tile.id}
        className="relative h-full w-full overflow-hidden transition-opacity duration-200"
      >
        <CMSImage
          src={tile.imageUrl}
          blur={tile.blur}
          sizes="(max-width: 768px) 50vw, 25vw"
          alt={tile.alt || ""}
          fill
          priority={priority}
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
}

export const GalleryTile = memo(GalleryTileComponent);
