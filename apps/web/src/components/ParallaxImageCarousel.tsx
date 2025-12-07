"use client";

import { useEffect, useRef, useState } from "react";
import CMSImage from "./CMSImage";

interface ParallaxImageCarouselProps {
  /** 图片对象数组 */
  images: Array<{
    url: string;
    width?: number;
    height?: number;
    blur?: string;
  }>;
  /** 自定义CSS类名 */
  className?: string;
  /** 视差滚动速度，负值表示反向滚动 */
  parallaxSpeed?: number;
  /** 图片alt文本前缀 */
  alt?: string;
}

interface ImageDimension {
  width: number;
  height: number;
  aspectRatio: number;
}

interface AspectRatioOption {
  value: number;
  class: string;
}

/**
 * 视差图片轮播组件
 *
 * 特性：
 * - 图片从右往左排列，第一张图片在最右侧
 * - 动态创建图片实例，确保视口中始终有图片显示
 * - 根据图片原始宽高比自适应尺寸（使用Tailwind CSS aspect-ratio类）
 * - 支持视差滚动效果
 * - 预加载图片并获取真实尺寸
 * - 完全使用Tailwind CSS，无需额外CSS文件
 */
export default function ParallaxImageCarousel({
  images,
  className = "",
  parallaxSpeed = -0.6,
  alt = "Parallax image",
}: ParallaxImageCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageDimensions, setImageDimensions] = useState<ImageDimension[]>([]);
  const [visibleImageInstances, setVisibleImageInstances] = useState<
    Array<{
      id: string;
      src: string;
      originalIndex: number;
      position: number;
    }>
  >([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // 获取最接近的aspect-ratio类名
  const getAspectRatioClass = (ratio: number): string => {
    const ratios: AspectRatioOption[] = [
      { value: 16 / 9, class: "aspect-video" }, // 16:9
      { value: 4 / 3, class: "aspect-[4/3]" }, // 4:3
      { value: 3 / 2, class: "aspect-[3/2]" }, // 3:2
      { value: 1, class: "aspect-square" }, // 1:1
      { value: 2 / 3, class: "aspect-[2/3]" }, // 2:3
      { value: 9 / 16, class: "aspect-[9/16]" }, // 9:16
    ];

    if (ratios.length === 0) return "aspect-square";

    let closest = ratios[0];
    if (!closest) return "aspect-square";

    let minDiff = Math.abs(ratio - closest.value);

    for (const r of ratios) {
      const diff = Math.abs(ratio - r.value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = r;
      }
    }

    return closest.class;
  };

  // 容器尺寸监听
  useEffect(() => {
    if (!containerRef.current) return;

    const updateContainerSize = () => {
      const container = containerRef.current;
      if (container) {
        setContainerWidth(container.offsetWidth);
        setContainerHeight(container.offsetHeight);
      }
    };

    updateContainerSize();

    const resizeObserver = new ResizeObserver(updateContainerSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  // images 变化时，处理图片尺寸信息
  useEffect(() => {
    // 过滤掉无效图片
    const validImages = images.filter(
      (img) => img && img.url && img.url.trim() !== "",
    );

    if (!validImages.length) {
      setImageDimensions([]);
      return;
    }

    setImageDimensions(
      validImages.map((img) => {
        // 如果有明确的尺寸信息，使用实际尺寸
        if (img.width && img.height) {
          return {
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height,
          };
        }
        // 默认 16:9 占位
        return {
          width: 16,
          height: 9,
          aspectRatio: 16 / 9,
        };
      }),
    );
  }, [images]);

  // 动态计算可见图片实例
  useEffect(() => {
    if (!imageDimensions.length || !containerWidth || !containerHeight) return;

    // 过滤出有效图片
    const validImages = images.filter(
      (img) => img && img.url && img.url.trim() !== "",
    );
    if (!validImages.length) return;

    // 计算单个循环图片序列的总宽度
    const singleCycleWidth = imageDimensions.reduce(
      (total, dimension) => total + containerHeight * dimension.aspectRatio,
      0,
    );

    // 计算需要的图片实例：确保覆盖容器宽度 + 左右缓冲区
    const bufferWidth = containerWidth * 0.5; // 左右各25%缓冲
    const targetWidth = containerWidth + bufferWidth * 2;

    // 计算需要多少个完整循环
    const cyclesNeeded = Math.ceil(targetWidth / singleCycleWidth) + 1; // 多加一个循环确保无缝切换

    // 生成图片实例
    const instances: Array<{
      id: string;
      src: string;
      originalIndex: number;
      position: number;
    }> = [];

    let validImageIndex = 0; // 用于追踪有效图片的索引

    for (let cycle = 0; cycle < cyclesNeeded; cycle++) {
      for (let imgIndex = 0; imgIndex < images.length; imgIndex++) {
        const imageData = images[imgIndex];
        if (!imageData || !imageData.url || imageData.url.trim() === "")
          continue; // 跳过无效图片

        const dimension = imageDimensions[validImageIndex];
        if (!dimension) continue;

        const position =
          cycle * singleCycleWidth +
          imageDimensions
            .slice(0, validImageIndex)
            .reduce(
              (total, dim) => total + containerHeight * dim.aspectRatio,
              0,
            );

        instances.push({
          id: `${cycle}-${imgIndex}`,
          src: imageData.url,
          originalIndex: validImageIndex,
          position,
        });

        validImageIndex++;
      }
      validImageIndex = 0; // 重置有效图片索引，开始下一个循环
    }

    setVisibleImageInstances(instances);
  }, [images, imageDimensions, containerWidth, containerHeight]);

  // 如果没有图片，或者所有图片都无效，返回空
  if (
    !images.length ||
    images.every((img) => !img || !img.url || img.url.trim() === "")
  ) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`group h-full md:flex md:flex-row-reverse overflow-visible opacity-25 ${className}`}
      data-parallax={parallaxSpeed.toString()}
    >
      {visibleImageInstances.map((instance) => {
        const dimension = imageDimensions[instance.originalIndex];
        const originalImageData = images.find(
          (img) => img.url === instance.src,
        );

        if (!dimension) return null;

        const aspectRatioClass = getAspectRatioClass(dimension.aspectRatio);

        return (
          <div
            key={instance.id}
            className={`h-full w-full md:w-auto flex-shrink-0 relative ${aspectRatioClass}`}
            style={{
              width:
                window.innerWidth >= 768
                  ? `${containerHeight * dimension.aspectRatio}px`
                  : undefined,
              flexBasis:
                window.innerWidth >= 768
                  ? `${containerHeight * dimension.aspectRatio}px`
                  : undefined,
            }}
          >
            <CMSImage
              src={instance.src}
              alt={`${alt} ${instance.originalIndex + 1}`}
              fill
              className="object-cover"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              optimized={
                !!(originalImageData?.width && originalImageData?.height)
              }
              width={originalImageData?.width}
              height={originalImageData?.height}
              blur={originalImageData?.blur}
              onLoadingComplete={(imgEl) => {
                // 只在没有预定义尺寸时更新尺寸信息
                if (!originalImageData?.width || !originalImageData?.height) {
                  const w = imgEl.naturalWidth || 16;
                  const h = imgEl.naturalHeight || 9;
                  const ar = h ? w / h : 16 / 9;

                  setImageDimensions((prev) => {
                    const cur = prev[instance.originalIndex];
                    if (!cur || cur.width !== w || cur.height !== h) {
                      const next = [...prev];
                      next[instance.originalIndex] = {
                        width: w,
                        height: h,
                        aspectRatio: ar,
                      };
                      return next;
                    }
                    return prev;
                  });
                }
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
