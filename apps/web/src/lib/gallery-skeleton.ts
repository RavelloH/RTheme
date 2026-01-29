import type { GalleryPhoto } from "@/lib/gallery-layout";
import { GallerySize } from "@/lib/gallery-layout";

// Generates pseudo-random dummy photos for skeleton loading
export function generateSkeletonPhotos(count: number): GalleryPhoto[] {
  const skeletons: GalleryPhoto[] = [];

  for (let i = 0; i < count; i++) {
    // Deterministic random-ish based on index to avoid flickering if re-called
    const rand = (i * 137) % 100;
    let size = GallerySize.SQUARE;

    if (rand < 50) size = GallerySize.SQUARE;
    else if (rand < 70) size = GallerySize.WIDE;
    else if (rand < 90) size = GallerySize.TALL;
    else size = GallerySize.LARGE;

    skeletons.push({
      id: -1 - i, // Negative IDs for skeletons
      slug: `skeleton-${i}`,
      size: size,
      imageUrl: "", // Empty for skeleton
      width: 100,
      height: 100,
    });
  }
  return skeletons;
}
