import { RiArrowRightLine } from "@remixicon/react";

import type {
  CallToActionBlockConfig,
  CallToActionData,
} from "@/blocks/collection/CallToAction/types";
import { ProcessedText } from "@/blocks/core/components";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import CMSImage from "@/components/ui/CMSImage";
import Link from "@/components/ui/Link";

/**
 * CallToActionBlock - 服务端组件
 * 行动号召区块，引导用户采取行动
 */
export default function CallToActionBlock({
  config,
}: {
  config: CallToActionBlockConfig;
}) {
  const { content } = config;
  const data = (config.data as CallToActionData) || {};

  const title = content.title || "";
  const subtitle = content.subtitle || "";
  const description = content.description || [];
  const primaryButton = content.primaryButton;
  const secondaryButton = content.secondaryButton;
  const style = content.layout?.style || "minimal";
  const align = content.layout?.align || "center";
  const ratio = content.layout?.ratio ?? 1;

  // 获取处理后的背景图数据
  const bgImageData = data.backgroundImage;
  const bgImageSrc = bgImageData?.url || content.backgroundImage;

  // 对齐类名
  const alignClass = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  }[align];

  // 样式相关类名
  const getContainerClasses = () => {
    switch (style) {
      case "bold":
        return "bg-primary text-primary-foreground";
      case "gradient":
        return "bg-gradient-to-r from-primary via-primary/70 to-background0 text-primary-foreground";
      default:
        return "";
    }
  };

  const getPrimaryButtonClasses = () => {
    switch (style) {
      case "bold":
      case "gradient":
        return "bg-primary-foreground text-primary hover:bg-primary-foreground/90";
      default:
        return "bg-primary text-primary-foreground hover:bg-primary/90";
    }
  };

  const getSecondaryButtonClasses = () => {
    switch (style) {
      case "bold":
      case "gradient":
        return "border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10";
      default:
        return "border-primary text-primary hover:bg-primary/10";
    }
  };

  return (
    <RowGrid>
      <GridItem
        areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
        width={ratio}
        height={1}
        className={`relative overflow-hidden ${getContainerClasses()}`}
      >
        {/* 背景图片 */}
        {bgImageSrc && style === "minimal" && (
          <>
            <CMSImage
              src={bgImageSrc}
              alt=""
              fill
              width={bgImageData?.width}
              height={bgImageData?.height}
              blur={bgImageData?.blur}
              className="object-cover"
            />
            <div className="absolute inset-0 bg-background/50" />
          </>
        )}

        {/* 内容 */}
        <div
          className={`relative z-10 h-full flex flex-col justify-center px-10 py-15 ${alignClass}`}
        >
          {/* 副标题 */}
          {subtitle && (
            <div
              className="text-xl uppercase tracking-[0.2em] opacity-70 mb-4"
              data-line-reveal
            >
              <ProcessedText text={subtitle} data={data} inline />
            </div>
          )}

          {/* 主标题 */}
          {title && (
            <h2
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
              data-fade-char
            >
              <ProcessedText text={title} data={data} inline />
            </h2>
          )}

          {/* 描述 */}
          {description.length > 0 && (
            <div
              className="text-xl md:text-2xl opacity-80 mb-10 space-y-2"
              data-line-reveal
            >
              {description.map((line, index) => (
                <div key={index}>
                  <ProcessedText text={line} data={data} inline />
                </div>
              ))}
            </div>
          )}

          {/* 按钮组 */}
          {(primaryButton?.text || secondaryButton?.text) && (
            <div
              className={`flex gap-4 ${align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"}`}
            >
              {primaryButton?.text && primaryButton?.link && (
                <Link
                  href={primaryButton.link}
                  className={`inline-flex items-center gap-2 px-8 py-4 text-lg font-medium rounded-none transition-all ${getPrimaryButtonClasses()}`}
                >
                  <ProcessedText text={primaryButton.text} data={data} inline />
                  <RiArrowRightLine className="w-5 h-5" />
                </Link>
              )}
              {secondaryButton?.text && secondaryButton?.link && (
                <Link
                  href={secondaryButton.link}
                  className={`inline-flex items-center gap-2 px-8 py-4 text-lg font-medium border-2 rounded-none transition-all ${getSecondaryButtonClasses()}`}
                >
                  <ProcessedText
                    text={secondaryButton.text}
                    data={data}
                    inline
                  />
                </Link>
              )}
            </div>
          )}
        </div>
      </GridItem>
    </RowGrid>
  );
}
