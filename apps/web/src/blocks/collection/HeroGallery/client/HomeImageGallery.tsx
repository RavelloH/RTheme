"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Marquee from "react-fast-marquee";
import gsap from "gsap";

import CMSImage from "@/components/ui/CMSImage";
import { useBroadcast } from "@/hooks/use-broadcast";
import { useMobile } from "@/hooks/use-mobile";
import type { ProcessedImageData } from "@/lib/shared/image-common";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

type GalleryFilter =
  | "none"
  | "mix-blend-hue"
  | "dark"
  | "gray"
  | "warm"
  | "cool"
  | "vintage"
  | "contrast"
  | "sepia"
  | "saturate"
  | "film"
  | "dramatic"
  | "soft"
  | "fade"
  | "cinematic"
  | "noire"
  | "bloom"
  | "inverted"
  | "duotone";

// 获取滤镜配置
const getFilterConfig = (filter: GalleryFilter) => {
  const configs: Record<
    GalleryFilter,
    {
      defaultFilter: string;
      overlayClass?: string;
      overlayOpacity?: number;
      blendMode?: string;
    }
  > = {
    none: {
      defaultFilter: "brightness(1) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    "mix-blend-hue": {
      defaultFilter:
        "grayscale(70%) brightness(0.8) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
      overlayClass: "bg-primary",
      overlayOpacity: 1,
      blendMode: "hue",
    },
    dark: {
      defaultFilter:
        "brightness(0.6) contrast(1.1) drop-shadow(0 15px 30px rgba(0,0,0,0.5))",
    },
    gray: {
      defaultFilter:
        "grayscale(100%) brightness(0.9) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    warm: {
      defaultFilter:
        "sepia(30%) saturate(140%) brightness(0.95) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    cool: {
      defaultFilter:
        "saturate(80%) hue-rotate(30deg) brightness(0.9) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    vintage: {
      defaultFilter:
        "sepia(50%) contrast(1.2) brightness(0.85) saturate(120%) drop-shadow(0 15px 30px rgba(0,0,0,0.4))",
    },
    contrast: {
      defaultFilter:
        "contrast(1.4) brightness(0.95) saturate(110%) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    sepia: {
      defaultFilter:
        "sepia(80%) brightness(0.9) contrast(1.1) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    saturate: {
      defaultFilter:
        "saturate(200%) brightness(1) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    film: {
      defaultFilter:
        "sepia(15%) contrast(1.1) saturate(90%) brightness(0.9) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    dramatic: {
      defaultFilter:
        "contrast(1.5) brightness(0.7) saturate(120%) drop-shadow(0 15px 30px rgba(0,0,0,0.5))",
    },
    soft: {
      defaultFilter:
        "contrast(0.9) brightness(1.05) saturate(90%) drop-shadow(0 10px 20px rgba(0,0,0,0.2))",
    },
    fade: {
      defaultFilter:
        "saturate(60%) brightness(1.1) contrast(0.9) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    cinematic: {
      defaultFilter:
        "contrast(1.2) saturate(110%) brightness(0.85) hue-rotate(10deg) drop-shadow(0 15px 30px rgba(0,0,0,0.4))",
    },
    noire: {
      defaultFilter:
        "grayscale(100%) contrast(1.6) brightness(0.7) drop-shadow(0 15px 30px rgba(0,0,0,0.6))",
    },
    bloom: {
      defaultFilter:
        "brightness(1.1) saturate(130%) contrast(1.1) drop-shadow(0 20px 40px rgba(0,0,0,0.2))",
    },
    inverted: {
      defaultFilter:
        "invert(100%) hue-rotate(180deg) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
    duotone: {
      defaultFilter:
        "grayscale(100%) sepia(100%) hue-rotate(190deg) saturate(500%) brightness(0.9) contrast(1.1) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
    },
  };

  return configs[filter] || configs["mix-blend-hue"];
};

export default function HomeImageGallery({
  images = [],
  filter = "mix-blend-hue",
}: {
  images?: ProcessedImageData[];
  filter?: GalleryFilter;
}) {
  const displayImages = useMemo(
    () => images.filter((image) => Boolean(image?.url)).slice(0, 9),
    [images],
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const replayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 获取当前滤镜配置
  const filterConfig = getFilterConfig(filter);
  const isMobile = useMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAllLoaded, setIsAllLoaded] = useState(true);
  const [isAnimationComplete, setIsAnimationComplete] = useState(true);

  // 播放入场动画（用于 loadingComplete 后重播）
  const playEntranceAnimation = useCallback(() => {
    if (isMobile) {
      setIsAnimationComplete(true);
      return;
    }

    const images = imagesRef.current.filter(Boolean);
    if (images.length === 0) {
      setIsAnimationComplete(true);
      return;
    }

    const tween = gsap.to(images, {
      x: 0,
      opacity: 1,
      duration: 1.2,
      ease: "power3.out",
      stagger: 0.08,
      onComplete: () => {
        setIsAnimationComplete(true);
      },
    });

    animationRef.current = tween;
  }, [isMobile]);

  // 重置到入场动画前的隐藏位
  const resetImagesForReplay = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }

    const images = imagesRef.current.filter(Boolean);
    const totalImages = images.length;

    images.forEach((img) => {
      if (img) {
        gsap.killTweensOf(img);
      }
    });

    images.forEach((img, index) => {
      if (!img) return;

      const baseProgress = totalImages > 1 ? index / (totalImages - 1) : 0.5;
      const baseX = baseProgress * 100;
      const xPercent = -baseProgress * 100;

      gsap.set(img, {
        left: `${baseX}%`,
        xPercent: xPercent,
        x: -2000,
        opacity: 0,
      });
    });
  }, []);

  // 默认可见；收到 loadingComplete 后重新播放入场动画
  useEffect(() => {
    const handleLoadingComplete = () => {
      setIsAnimationComplete(false);
      setIsAllLoaded(false);
      resetImagesForReplay();

      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }

      replayTimerRef.current = setTimeout(() => {
        setIsAllLoaded(true);
        playEntranceAnimation();
      }, 500);
    };

    window.addEventListener("loadingComplete", handleLoadingComplete);
    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
      if (animationRef.current) {
        animationRef.current.kill();
        animationRef.current = null;
      }
    };
  }, [playEntranceAnimation, resetImagesForReplay]);

  // 订阅全局鼠标移动事件
  useBroadcast<
    | {
        type: "mouse-move";
        x: number;
        y: number;
      }
    | {
        type: "mouse-leave";
      }
  >((message) => {
    if (isMobile) return;

    // 等待入场动画完成后才启用鼠标追踪，避免重影
    if (!isAnimationComplete) return;

    const images = imagesRef.current.filter(Boolean);
    if (images.length === 0) return;

    // 处理鼠标离开事件
    if (message.type === "mouse-leave") {
      const totalImages = images.length;

      images.forEach((img, index) => {
        if (!img) return;

        // 恢复初始状态
        const baseProgress = totalImages > 1 ? index / (totalImages - 1) : 0.5;
        const baseX = baseProgress * 100;
        const xPercent = -baseProgress * 100;

        gsap.to(img, {
          left: `${baseX}%`,
          xPercent: xPercent,
          x: 0, // 恢复到基础位置
          filter: filterConfig.defaultFilter,
          duration: 0.8,
          ease: "power2.out",
        });

        // 恢复叠加层透明度
        const overlay = img.querySelector(".theme-overlay") as HTMLElement;
        if (overlay && filterConfig.overlayOpacity !== undefined) {
          gsap.to(overlay, {
            opacity: filterConfig.overlayOpacity,
            duration: 0.8,
            ease: "power2.out",
          });
        }
      });

      return; // 结束处理
    }

    // 处理鼠标移动事件
    if (message.type === "mouse-move") {
      // 将归一化的坐标转换为 -1 到 1
      const offsetX = message.x * 2 - 1;

      // 获取鼠标在视口中的实际像素位置
      const mousePixelX = message.x * window.innerWidth;

      const totalImages = images.length;

      images.forEach((img, index) => {
        if (!img) return;

        // 计算每张图片的基础位置（均匀分布）
        const baseProgress = totalImages > 1 ? index / (totalImages - 1) : 0.5;
        const baseX = baseProgress * 100; // 百分比位置

        // 计算 xPercent：第一张 0%，最后一张 -100%，中间 -50%
        const xPercent = -baseProgress * 100;

        // 获取图片在视口中的实际位置
        const imgRect = img.getBoundingClientRect();
        const imgCenterX = imgRect.left + imgRect.width / 2;

        // 计算鼠标和图片中心的距离（归一化到 0-1）
        const distancePixels = Math.abs(mousePixelX - imgCenterX);
        const maxDistance = window.innerWidth / 2; // 最大距离为半个屏幕宽度
        const distance = Math.min(distancePixels / maxDistance, 1);

        // 使用高斯衰减函数，距离越近颜色越多
        const colorInfluence = Math.exp(-(distance * distance) / 0.08); // 0.08 控制衰减速度

        // 两端固定，中间移动：使用抛物线函数
        const influence = Math.sin(baseProgress * Math.PI);

        const depthX = influence * 60; // 横向视差强度（只保留水平移动）

        // 根据滤镜类型计算动态效果
        // colorInfluence: 0 = 鼠标最远（完整滤镜效果），1 = 鼠标最近（接近原图）
        let dynamicFilter: string;

        if (filter === "none") {
          // 无滤镜：只调整亮度
          const brightness = 0.9 + colorInfluence * 0.1;
          dynamicFilter = `brightness(${brightness}) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "mix-blend-hue") {
          // 主色调色相滤镜：灰度降低、亮度提升（恢复原图）
          const grayscale = (1 - colorInfluence) * 60; // 60% → 0%
          const brightness = 0.8 + colorInfluence * 0.2; // 0.8 → 1.0
          dynamicFilter = `grayscale(${grayscale}%) brightness(${brightness}) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "dark") {
          // 暗色滤镜：亮度增加（恢复原图）
          const brightness = 0.6 + colorInfluence * 0.4; // 0.6 → 1.0
          const contrast = 1.1 - colorInfluence * 0.1; // 1.1 → 1.0
          dynamicFilter = `brightness(${brightness}) contrast(${contrast}) drop-shadow(0 15px 30px rgba(0,0,0,0.5))`;
        } else if (filter === "gray") {
          // 灰度滤镜：灰度减少（恢复原图）
          const grayscale = (1 - colorInfluence) * 100; // 100% → 0%
          dynamicFilter = `grayscale(${grayscale}%) brightness(0.9) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "warm") {
          // 暖色调滤镜：减少 sepia 和饱和度（恢复原图）
          const sepia = 30 * (1 - colorInfluence); // 30% → 0%
          const saturate = 140 - colorInfluence * 40; // 140% → 100%
          dynamicFilter = `sepia(${sepia}%) saturate(${saturate}%) brightness(0.95) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "cool") {
          // 冷色调滤镜：减少色相旋转和饱和度（恢复原图）
          const hueRotate = 30 * (1 - colorInfluence); // 30deg → 0deg
          const saturate = 80 + colorInfluence * 20; // 80% → 100%
          dynamicFilter = `saturate(${saturate}%) hue-rotate(${hueRotate}deg) brightness(0.9) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "vintage") {
          // 复古风：减少 sepia、对比度、饱和度（恢复原图）
          const sepia = 50 * (1 - colorInfluence); // 50% → 0%
          const contrast = 1.2 - colorInfluence * 0.2; // 1.2 → 1.0
          const saturate = 120 - colorInfluence * 20; // 120% → 100%
          dynamicFilter = `sepia(${sepia}%) contrast(${contrast}) brightness(${0.85 + colorInfluence * 0.15}) saturate(${saturate}%) drop-shadow(0 15px 30px rgba(0,0,0,0.4))`;
        } else if (filter === "contrast") {
          // 高对比度：对比度降低（恢复原图）
          const contrast = 1.4 - colorInfluence * 0.4; // 1.4 → 1.0
          dynamicFilter = `contrast(${contrast}) brightness(0.95) saturate(110%) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "sepia") {
          // 怀旧褐色：sepia 大幅减少（恢复原图）
          const sepia = 80 * (1 - colorInfluence); // 80% → 0%
          dynamicFilter = `sepia(${sepia}%) brightness(0.9) contrast(1.1) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "saturate") {
          // 高饱和度：饱和度大幅降低（恢复原图）
          const saturate = 200 - colorInfluence * 100; // 200% → 100%
          dynamicFilter = `saturate(${saturate}%) brightness(1) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "film") {
          // 胶片感：减少 sepia 和对比度（恢复原图）
          const sepia = 15 * (1 - colorInfluence); // 15% → 0%
          const contrast = 1.1 - colorInfluence * 0.1; // 1.1 → 1.0
          const saturate = 90 + colorInfluence * 10; // 90% → 100%
          dynamicFilter = `sepia(${sepia}%) contrast(${contrast}) saturate(${saturate}%) brightness(${0.9 + colorInfluence * 0.1}) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "dramatic") {
          // 戏剧性：对比度降低、亮度大幅提升（恢复原图）
          const contrast = 1.5 - colorInfluence * 0.5; // 1.5 → 1.0
          const brightness = 0.7 + colorInfluence * 0.3; // 0.7 → 1.0
          const saturate = 120 - colorInfluence * 20; // 120% → 100%
          dynamicFilter = `contrast(${contrast}) brightness(${brightness}) saturate(${saturate}%) drop-shadow(0 15px 30px rgba(0,0,0,0.5))`;
        } else if (filter === "soft") {
          // 柔和：对比度增加趋向正常
          const contrast = 0.9 + colorInfluence * 0.1; // 0.9 → 1.0
          const brightness = 1.05 - colorInfluence * 0.05; // 1.05 → 1.0
          dynamicFilter = `contrast(${contrast}) brightness(${brightness}) saturate(90%) drop-shadow(0 10px 20px rgba(0,0,0,0.2))`;
        } else if (filter === "fade") {
          // 褪色：饱和度和对比度增加（恢复原图）
          const saturate = 60 + colorInfluence * 40; // 60% → 100%
          const contrast = 0.9 + colorInfluence * 0.1; // 0.9 → 1.0
          const brightness = 1.1 - colorInfluence * 0.1; // 1.1 → 1.0
          dynamicFilter = `saturate(${saturate}%) brightness(${brightness}) contrast(${contrast}) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "cinematic") {
          // 电影感：亮度提升、色相旋转减少（恢复原图）
          const brightness = 0.85 + colorInfluence * 0.15; // 0.85 → 1.0
          const hueRotate = 10 * (1 - colorInfluence); // 10deg → 0deg
          const contrast = 1.2 - colorInfluence * 0.2; // 1.2 → 1.0
          dynamicFilter = `contrast(${contrast}) saturate(110%) brightness(${brightness}) hue-rotate(${hueRotate}deg) drop-shadow(0 15px 30px rgba(0,0,0,0.4))`;
        } else if (filter === "noire") {
          // 黑色电影：亮度大幅提升、对比度降低（恢复原图）
          const brightness = 0.7 + colorInfluence * 0.3; // 0.7 → 1.0
          const contrast = 1.6 - colorInfluence * 0.6; // 1.6 → 1.0
          dynamicFilter = `grayscale(100%) contrast(${contrast}) brightness(${brightness}) drop-shadow(0 15px 30px rgba(0,0,0,0.6))`;
        } else if (filter === "bloom") {
          // 泛光：亮度和饱和度降低（恢复原图）
          const brightness = 1.1 - colorInfluence * 0.1; // 1.1 → 1.0
          const saturate = 130 - colorInfluence * 30; // 130% → 100%
          dynamicFilter = `brightness(${brightness}) saturate(${saturate}%) contrast(1.1) drop-shadow(0 20px 40px rgba(0,0,0,0.2))`;
        } else if (filter === "inverted") {
          // 反色：这个保持特殊性，只微调色相
          const hueRotate = 180 + colorInfluence * 20; // 180deg → 200deg
          dynamicFilter = `invert(100%) hue-rotate(${hueRotate}deg) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else if (filter === "duotone") {
          // 双色调：饱和度大幅降低（接近原图）
          const saturate = 500 - colorInfluence * 400; // 500% → 100%
          dynamicFilter = `grayscale(100%) sepia(100%) hue-rotate(190deg) saturate(${saturate}%) brightness(0.9) contrast(1.1) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        } else {
          // 默认
          const brightness = 0.9 + colorInfluence * 0.1;
          dynamicFilter = `brightness(${brightness}) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`;
        }

        gsap.to(img, {
          left: `${baseX}%`,
          xPercent: xPercent,
          x: offsetX * depthX,
          filter: dynamicFilter,
          duration: 0.5,
          ease: "power2.out",
        });

        // 控制叠加层的透明度（仅对 mix-blend-hue 有效）
        const overlay = img.querySelector(".theme-overlay") as HTMLElement;
        if (overlay && filter === "mix-blend-hue") {
          gsap.to(overlay, {
            opacity: 1 - colorInfluence, // 鼠标靠近时透明度降低
            duration: 0.5,
            ease: "power2.out",
          });
        }
      });
    }
  });

  useEffect(() => {
    if (isMobile) {
      if (displayImages.length <= 1) return;

      // 移动端自动轮播
      const interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % displayImages.length);
      }, 3000);

      return () => clearInterval(interval);
    }

    if (!containerRef.current) return;

    const images = imagesRef.current.filter(Boolean);

    const totalImages = images.length;

    // 挂载后立即设置到可见基础位，避免等待 loadingComplete 才显示
    images.forEach((img, index) => {
      if (!img) return;

      // 计算百分比位置
      const baseProgress = totalImages > 1 ? index / (totalImages - 1) : 0.5;
      const baseX = baseProgress * 100;
      const xPercent = -baseProgress * 100; // 第一张 0%，最后一张 -100%

      gsap.set(img, {
        left: `${baseX}%`,
        xPercent: xPercent,
        x: 0,
        y: 0,
        rotation: 0, // 始终水平，不旋转
        filter: filterConfig.defaultFilter,
        zIndex: totalImages - index, // 反向 z-index，后面的图片在上层
        scale: 1,
        opacity: 1,
      });

      // 初始化叠加层透明度
      const overlay = img.querySelector(".theme-overlay") as HTMLElement;
      if (overlay) {
        gsap.set(overlay, {
          opacity: filterConfig.overlayOpacity ?? 0,
        });
      }
    });
  }, [isMobile, displayImages.length, filterConfig]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full flex items-center justify-center overflow-hidden relative"
    >
      {/* 加载提示 */}
      <AutoTransition>
        {!isAllLoaded &&
          (isMobile ? (
            <div className="flex items-center justify-center">
              <LoadingIndicator />
            </div>
          ) : (
            <div className="absolute inset-0 z-50 text-8xl">
              <Marquee
                speed={40}
                autoFill={true}
                direction="right"
                className="h-1/2 border border-muted"
              >
                &nbsp;&nbsp;SCROLL&nbsp;&nbsp;{"==>"}
                &nbsp;&nbsp;
              </Marquee>
              <Marquee
                speed={40}
                autoFill={true}
                direction="left"
                className="h-1/2 border border-muted"
              >
                &nbsp;&nbsp;SCROLL&nbsp;&nbsp;{"<=="}
                &nbsp;&nbsp;
              </Marquee>
            </div>
          ))}
      </AutoTransition>

      {isMobile ? (
        // 移动端简单轮播
        <div className="relative w-full h-full flex items-center justify-center">
          {displayImages.map((image, index) => (
            <div
              key={image.url}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <CMSImage
                src={image.url}
                width={image.width}
                height={image.height}
                blur={image.blur}
                alt={`Gallery ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : (
        // 桌面端交互式横向排列 - 100%宽度
        <div className="relative w-full h-full flex items-center justify-center overflow-visible">
          <div className="relative h-full w-full">
            {displayImages.map((image, index) => (
              <div
                key={image.url}
                ref={(el) => {
                  imagesRef.current[index] = el;
                }}
                className="absolute top-0 h-full aspect-[3/4] shadow-2xl overflow-hidden"
              >
                <CMSImage
                  src={image.url}
                  width={image.width}
                  height={image.height}
                  blur={image.blur}
                  alt={`Gallery ${index + 1}`}
                  fill
                  className="object-cover"
                />
                {/* 主题色叠加层（仅对 mix-blend-hue 滤镜有效） */}
                {filterConfig.overlayClass && (
                  <div
                    className={`theme-overlay absolute inset-0 pointer-events-none ${filterConfig.overlayClass}`}
                    style={{
                      opacity: filterConfig.overlayOpacity ?? 0,
                      mixBlendMode:
                        filterConfig.blendMode as React.CSSProperties["mixBlendMode"],
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
