"use client";

import Image from "next/image";

import Avatar from "@/../public/avatar.jpg";
import { ProcessedText } from "@/blocks/components";
import MarqueeText from "@/blocks/HeroGallery/client/MarqueeText";
import { GridItem } from "@/components/RowGrid";
import { useMobile } from "@/hooks/use-mobile";

interface HomeTextSectionProps {
  title?: string;
  slogan?: string;
}

/**
 * HomeTextSection - 客户端组件
 * 根据设备类型渲染不同的内容结构
 */
export default function HomeTextSection({
  title,
  slogan,
}: HomeTextSectionProps) {
  const isMobile = useMobile();

  if (!title && !slogan) return null;

  return (
    <>
      {/* 标题区域 */}
      {isMobile ? (
        // 移动端：标题和标语各自独占一行
        <>
          {title && (
            <GridItem
              areas={[7]}
              width={9}
              height={0.3}
              className="flex items-center text-8xl overflow-hidden"
            >
              <MarqueeText
                text={title}
                direction="right"
                className="font-bold"
              />
            </GridItem>
          )}
          {slogan && (
            <GridItem
              areas={title ? [8] : [7, 8, 9]}
              width={9}
              height={0.3}
              className="flex items-center text-8xl overflow-hidden"
            >
              <MarqueeText text={slogan} direction="left" />
            </GridItem>
          )}
        </>
      ) : (
        // 桌面端：静态标题
        <GridItem
          areas={[7, 8, 9]}
          width={9}
          height={0.3}
          className="flex items-center text-8xl overflow-hidden"
        >
          {title && (
            <div data-parallax="-0.5" className="p-12 font-bold" data-fade-char>
              <h1>
                <ProcessedText text={title} inline />
              </h1>
            </div>
          )}
        </GridItem>
      )}

      {/* 桌面端标语区域 */}
      {!isMobile && slogan && (
        <GridItem
          areas={[10, 11, 12]}
          width={9}
          height={0.3}
          className="flex items-center justify-start text-8xl"
        >
          <div className="h-full aspect-square mr-4 relative">
            <Image
              src={Avatar}
              alt="logo"
              className="h-full w-auto object-cover"
            />
          </div>
          <div
            className="flex-1 flex items-center justify-end pr-12 text-8xl"
            data-fade
          >
            <span data-parallax="0.5">
              <ProcessedText text={slogan} inline />
            </span>
          </div>
        </GridItem>
      )}
    </>
  );
}
