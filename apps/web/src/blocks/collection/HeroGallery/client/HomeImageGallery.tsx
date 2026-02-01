"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Marquee from "react-fast-marquee";
import gsap from "gsap";

import CMSImage from "@/components/ui/CMSImage";
import { useBroadcast } from "@/hooks/use-broadcast";
import { useMobile } from "@/hooks/use-mobile";
import { AutoTransition } from "@/ui/AutoTransition";
import { LoadingIndicator } from "@/ui/LoadingIndicator";

export default function HomeImageGallery({
  images = [],
}: {
  images?: string[];
}) {
  const displayImages = [...images].slice(0, 9);
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const animationRef = useRef<gsap.core.Tween | null>(null);
  const isMobile = useMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  // 播放入场动画的函数
  const playEntranceAnimation = useCallback(() => {
    if (isMobile) {
      setIsAnimationComplete(true);
      return;
    }

    const images = imagesRef.current.filter(Boolean);

    // 从左侧依次进入的动画 - 每张图片移动到各自的位置
    const tween = gsap.to(images, {
      x: 0, // 移动到各自应该在的位置
      opacity: 1,
      duration: 1.2,
      ease: "power3.out",
      stagger: 0.08, // 每张图片延迟0.08秒
      onComplete: () => {
        // 动画完成后启用鼠标追踪
        setIsAnimationComplete(true);
      },
    });

    // 保存动画引用
    animationRef.current = tween;
  }, [isMobile]);

  // 重置图片到初始位置
  const resetImages = useCallback(() => {
    // 先杀掉正在进行的入场动画（如果有）
    if (animationRef.current) {
      animationRef.current.kill();
      animationRef.current = null;
    }

    const images = imagesRef.current.filter(Boolean);
    const totalImages = images.length;

    // 杀掉所有图片上的动画（包括鼠标追踪动画）
    images.forEach((img) => {
      if (img) {
        gsap.killTweensOf(img);
      }
    });

    // 然后重置位置
    images.forEach((img, index) => {
      if (!img) return;

      const baseProgress = totalImages > 1 ? index / (totalImages - 1) : 0.5;
      const baseX = baseProgress * 100;
      const xPercent = -baseProgress * 100;

      gsap.set(img, {
        left: `${baseX}%`,
        xPercent: xPercent,
        x: -2000, // 重置到屏幕左侧外
        opacity: 0,
      });
    });

    setIsAnimationComplete(false);
  }, []);

  // 监听页面加载动画完成事件
  useEffect(() => {
    const handleLoadingComplete = () => {
      // 收到页面加载完成事件，先重置图片
      resetImages();
      setIsAllLoaded(false);

      // 延迟 500ms 后再播放动画
      setTimeout(() => {
        setIsAllLoaded(true);
        playEntranceAnimation();
      }, 500);
    };

    window.addEventListener("loadingComplete", handleLoadingComplete);

    return () => {
      window.removeEventListener("loadingComplete", handleLoadingComplete);
    };
  }, [resetImages, playEntranceAnimation]);

  // 处理单张图片加载完成
  const handleImageLoad = () => {
    setLoadedCount((prev) => prev + 1);
  };

  // 当所有图片加载完成时，立即触发入场动画
  useEffect(() => {
    if (loadedCount === displayImages.length && !isAllLoaded) {
      setIsAllLoaded(true);
      playEntranceAnimation();
    }
  }, [loadedCount, displayImages.length, isAllLoaded, playEntranceAnimation]);

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
          filter:
            "grayscale(60%) brightness(0.8) drop-shadow(0 15px 30px rgba(0,0,0,0.3))",
          duration: 0.8,
          ease: "power2.out",
        });

        // 恢复叠加层透明度
        const overlay = img.querySelector(".theme-overlay") as HTMLElement;
        if (overlay) {
          gsap.to(overlay, {
            opacity: 1,
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

        // 只使用 grayscale 和 brightness，不使用色相旋转
        const grayscale = (1 - colorInfluence) * 60; // 灰度：0-60%
        const brightness = 0.8 + colorInfluence * 0.2; // 亮度：0.8-1.0

        gsap.to(img, {
          left: `${baseX}%`,
          xPercent: xPercent,
          x: offsetX * depthX,
          filter: `grayscale(${grayscale}%) brightness(${brightness}) drop-shadow(0 15px 30px rgba(0,0,0,0.3))`,
          duration: 0.5,
          ease: "power2.out",
        });

        // 控制叠加层的透明度
        const overlay = img.querySelector(".theme-overlay") as HTMLElement;
        if (overlay) {
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
      // 移动端自动轮播
      const interval = setInterval(() => {
        setActiveIndex((prev) => (prev + 1) % displayImages.length);
      }, 3000);

      return () => clearInterval(interval);
    }

    if (!containerRef.current) return;

    const images = imagesRef.current.filter(Boolean);

    const totalImages = images.length;

    // 初始化图片位置 - 均匀分布在100%宽度，始终水平，默认黑白
    // 只在未加载完成时初始化到左侧，避免覆盖入场动画
    if (!isAllLoaded) {
      images.forEach((img, index) => {
        if (!img) return;

        // 计算百分比位置
        const baseProgress = totalImages > 1 ? index / (totalImages - 1) : 0.5;
        const baseX = baseProgress * 100;
        const xPercent = -baseProgress * 100; // 第一张 0%，最后一张 -100%

        gsap.set(img, {
          left: `${baseX}%`,
          xPercent: xPercent,
          x: -2000, // 加载完成前在屏幕左侧外（-2000px 确保完全不可见）
          y: 0,
          rotation: 0, // 始终水平，不旋转
          filter:
            "grayscale(70%) brightness(0.8) drop-shadow(0 15px 30px rgba(0,0,0,0.3))", // 默认灰度 + 稍暗 + 阴影
          zIndex: totalImages - index, // 反向 z-index，后面的图片在上层
          scale: 1,
          opacity: 0, // 加载完成前隐藏
        });

        // 初始化叠加层透明度
        const overlay = img.querySelector(".theme-overlay") as HTMLElement;
        if (overlay) {
          gsap.set(overlay, {
            opacity: 1, // 默认完全显示主题色叠加
          });
        }
      });
    }
  }, [isMobile, displayImages.length, isAllLoaded]);

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
          {displayImages.map((src, index) => (
            <div
              key={src}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === activeIndex ? "opacity-100" : "opacity-0"
              }`}
            >
              <CMSImage
                src={src}
                alt={`Gallery ${index + 1}`}
                fill
                className="object-cover"
                optimized={true}
                onLoad={handleImageLoad}
              />
            </div>
          ))}
        </div>
      ) : (
        // 桌面端交互式横向排列 - 100%宽度
        <div className="relative w-full h-full flex items-center justify-center overflow-visible">
          <div className="relative h-full w-full">
            {displayImages.map((src, index) => (
              <div
                key={src}
                ref={(el) => {
                  imagesRef.current[index] = el;
                }}
                className="absolute top-0 h-full aspect-[3/4] shadow-2xl overflow-hidden"
              >
                <CMSImage
                  src={src}
                  alt={`Gallery ${index + 1}`}
                  fill
                  className="object-cover"
                  optimized={true}
                  onLoad={handleImageLoad}
                />
                {/* 主题色叠加层 */}
                <div
                  className="theme-overlay absolute inset-0 bg-primary pointer-events-none mix-blend-hue"
                  style={{ opacity: 1 }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
