"use client";

import { useEffect, useRef, useState } from "react";

interface ParallaxImageCarouselProps {
  /** 图片URL数组 */
  images: string[];
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
 * - 自动重复图片以达到至少200%容器宽度
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
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  const [imageDimensions, setImageDimensions] = useState<ImageDimension[]>([]);

  // 获取最接近的aspect-ratio类名
  const getAspectRatioClass = (ratio: number): string => {
    const ratios: AspectRatioOption[] = [
      { value: 16/9, class: "aspect-video" }, // 16:9
      { value: 4/3, class: "aspect-[4/3]" },  // 4:3
      { value: 3/2, class: "aspect-[3/2]" },  // 3:2
      { value: 1, class: "aspect-square" },   // 1:1
      { value: 2/3, class: "aspect-[2/3]" },  // 2:3
      { value: 9/16, class: "aspect-[9/16]" }, // 9:16
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

  // 预加载图片并获取尺寸
  useEffect(() => {
    if (!images.length) return;

    const loadImageDimensions = async () => {
      const dimensions = await Promise.all(
        images.map(
          (src) =>
            new Promise<ImageDimension>((resolve) => {
              const img = document.createElement('img');
              img.onload = () => {
                resolve({
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                  aspectRatio: img.naturalWidth / img.naturalHeight,
                });
              };
              img.onerror = () => {
                // 如果图片加载失败，使用默认比例
                resolve({
                  width: 16,
                  height: 9,
                  aspectRatio: 16 / 9,
                });
              };
              img.src = src;
            })
        )
      );

      setImageDimensions(dimensions);
    };

    loadImageDimensions();
  }, [images]);

  // 计算需要重复的图片数组以达到至少200%宽度
  useEffect(() => {
    if (!imageDimensions.length || !containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const targetWidth = containerWidth * 2; // 200%

    // 计算一轮图片的总宽度（假设容器高度为100%）
    const containerHeight = container.offsetHeight || 400; // 默认高度
    const singleRoundWidth = imageDimensions.reduce(
      (total, dimension) => total + containerHeight * dimension.aspectRatio,
      0
    );

    // 计算需要重复多少轮
    const repetitions = Math.ceil(targetWidth / singleRoundWidth);

    // 生成重复的图片数组
    const repeated: string[] = [];
    for (let i = 0; i < repetitions; i++) {
      repeated.push(...images);
    }

    setProcessedImages(repeated);
  }, [images, imageDimensions]);

  // 如果没有图片，返回空
  if (!images.length) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`group h-full flex flex-row-reverse overflow-visible opacity-25 ${className}`}
      data-parallax={parallaxSpeed.toString()}
    >
      {processedImages.map((src, index) => {
        // 获取对应的原始图片尺寸
        const originalIndex = index % images.length;
        const dimension = imageDimensions[originalIndex];

        if (!dimension) return null;

        const aspectRatioClass = getAspectRatioClass(dimension.aspectRatio);

        return (
          <div
            key={`${src}-${index}`}
            className={`h-full flex-shrink-0 relative ${aspectRatioClass}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${alt} ${originalIndex + 1}`}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}
