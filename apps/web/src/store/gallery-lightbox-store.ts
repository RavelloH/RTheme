import { create } from "zustand";

interface ImageRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface GalleryLightboxState {
  // 原始图片的位置信息
  sourceRect: ImageRect | null;
  // 打开时的图片 ID
  openedPhotoId: number | null;
  // 缩略图 URL
  thumbnailUrl: string | null;
  // 设置源位置
  setSourceRect: (
    rect: ImageRect,
    photoId: number,
    thumbnailUrl: string,
  ) => void;
  // 清除状态
  clear: () => void;
}

export const useGalleryLightboxStore = create<GalleryLightboxState>((set) => ({
  sourceRect: null,
  openedPhotoId: null,
  thumbnailUrl: null,
  setSourceRect: (rect, photoId, thumbnailUrl) =>
    set({ sourceRect: rect, openedPhotoId: photoId, thumbnailUrl }),
  clear: () =>
    set({ sourceRect: null, openedPhotoId: null, thumbnailUrl: null }),
}));
