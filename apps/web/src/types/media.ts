/**
 * 媒体引用 slot 类型定义
 * 用于区分不同位置的图片引用
 */
export const MEDIA_SLOTS = {
  // 文章相关
  POST_FEATURED_IMAGE: "featuredImage", // 文章特色图片
  POST_CONTENT_IMAGE: "contentImage", // 文章内容图片

  // 标签相关
  TAG_FEATURED_IMAGE: "featuredImage", // 标签特色图片

  // 分类相关
  CATEGORY_FEATURED_IMAGE: "featuredImage", // 分类特色图片

  // 页面相关
  PAGE_FEATURED_IMAGE: "featuredImage", // 页面特色图片
  PAGE_CONTENT_IMAGE: "contentImage", // 页面内容图片

  // 项目相关
  PROJECT_FEATURED_IMAGE: "featuredImage", // 项目特色图片
  PROJECT_CONTENT_IMAGE: "contentImage", // 项目内容图片
} as const;

export type MediaSlot = (typeof MEDIA_SLOTS)[keyof typeof MEDIA_SLOTS];

/**
 * 媒体引用辅助函数
 */
export const MediaReferenceHelper = {
  /**
   * 获取实体的特色图片
   */
  getFeaturedImage: (
    mediaRefs?: Array<{ slot: string; media: { storageUrl: string } }>,
  ) => {
    return mediaRefs?.find(
      (ref) => ref.slot === MEDIA_SLOTS.POST_FEATURED_IMAGE,
    )?.media.storageUrl;
  },

  /**
   * 获取实体的所有内容图片
   */
  getContentImages: (
    mediaRefs?: Array<{ slot: string; media: { storageUrl: string } }>,
  ) => {
    return (
      mediaRefs
        ?.filter((ref) => ref.slot === MEDIA_SLOTS.POST_CONTENT_IMAGE)
        .map((ref) => ref.media.storageUrl) || []
    );
  },
};
