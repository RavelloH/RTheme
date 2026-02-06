import { RiDoubleQuotesL } from "@remixicon/react";

import type {
  TestimonialBlockConfig,
  TestimonialData,
} from "@/blocks/collection/Testimonials/types";
import { ProcessedText } from "@/blocks/core/components";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import CMSImage from "@/components/ui/CMSImage";
import { createArray } from "@/lib/client/create-array";

/**
 * TestimonialBlock - 服务端组件
 * 展示单个用户评价，支持双行显示模式
 */
export default function TestimonialBlock({
  config,
}: {
  config: TestimonialBlockConfig;
}) {
  const { content } = config;
  const data = (config.data as TestimonialData) || {};

  // 第一行评价数据
  const quote = content.quote || "";
  const author = content.author || "";
  const role = content.role || "";
  const avatarUrl = content.avatar || "";
  const avatarData = data.avatarData;

  // 第二行评价数据（双行模式）
  const quote2 = content.quote2 || "";
  const author2 = content.author2 || "";
  const role2 = content.role2 || "";
  const avatar2Url = content.avatar2 || "";
  const avatar2Data = data.avatar2Data;

  const style = content.layout?.style || "cards";
  const ratio = content.layout?.ratio ?? 0.8;
  const enableDualRow = content.layout?.enableDualRow ?? false;
  const background = content.layout?.background || "muted";

  // 渲染头像
  const renderAvatar = (
    avatarSrc: string,
    authorName: string,
    size: string = "w-14 h-14",
    imageData?: {
      url?: string;
      width?: number;
      height?: number;
      blur?: string;
    },
  ) => {
    const src = imageData?.url || avatarSrc;

    if (src) {
      return (
        <div
          className={`${size} relative rounded-full overflow-hidden flex-shrink-0`}
        >
          <CMSImage
            src={src}
            alt={authorName || ""}
            fill
            width={imageData?.width}
            height={imageData?.height}
            blur={imageData?.blur}
            className="object-cover"
          />
        </div>
      );
    }

    return (
      <div
        className={`${size} rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0`}
      >
        {authorName ? authorName.charAt(0).toUpperCase() : "?"}
      </div>
    );
  };

  // 渲染单个评价项
  const renderTestimonial = (
    quoteText: string,
    authorName: string,
    roleText: string,
    aUrl: string,
    aData?: { url?: string; width?: number; height?: number; blur?: string },
  ) => {
    // 卡片样式
    if (style === "cards") {
      const bgClass = background === "muted" ? "bg-muted/30" : "bg-background";
      return (
        <div className={`flex flex-col justify-between p-10 ${bgClass} h-full`}>
          {/* 引号装饰 */}
          <RiDoubleQuotesL className="w-12 h-12 text-primary opacity-30 mb-6" />

          {/* 评价内容 */}
          <blockquote
            className="text-2xl md:text-3xl leading-relaxed flex-1"
            data-fade-char
          >
            <ProcessedText text={quoteText} data={data} inline />
          </blockquote>

          {/* 作者信息 */}
          <div className="mt-8 flex items-center gap-4">
            {renderAvatar(aUrl, authorName, undefined, aData)}
            <div>
              <div className="text-xl font-medium" data-line-reveal>
                <ProcessedText text={authorName} data={data} inline />
              </div>
              {roleText && (
                <div
                  className="text-base text-muted-foreground"
                  data-line-reveal
                >
                  <ProcessedText text={roleText} data={data} inline />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // 极简样式
    if (style === "minimal") {
      return (
        <div className="flex flex-col justify-center items-center text-center px-10 h-full">
          <blockquote
            className="text-3xl md:text-4xl italic leading-relaxed mb-8"
            data-fade-char
          >
            &quot;
            <ProcessedText text={quoteText} data={data} inline />
            &quot;
          </blockquote>
          <div className="text-xl" data-line-reveal>
            — <ProcessedText text={authorName} data={data} inline />
            {roleText && (
              <span className="text-muted-foreground ml-2">
                · <ProcessedText text={roleText} data={data} inline />
              </span>
            )}
          </div>
        </div>
      );
    }

    // 引用聚焦样式
    return (
      <div className="flex flex-col justify-center px-10 relative h-full">
        {/* 大引号背景 */}
        <RiDoubleQuotesL className="absolute top-10 left-10 w-40 h-40 text-primary opacity-10" />

        <div className="relative z-10">
          <blockquote
            className="text-4xl md:text-5xl leading-relaxed mb-10"
            data-fade-char
          >
            <ProcessedText text={quoteText} data={data} inline />
          </blockquote>

          <div className="flex items-center gap-4">
            {aUrl && renderAvatar(aUrl, authorName, "w-16 h-16", aData)}
            <div>
              <div className="text-2xl font-medium" data-line-reveal>
                <ProcessedText text={authorName} data={data} inline />
              </div>
              {roleText && (
                <div className="text-lg text-muted-foreground" data-line-reveal>
                  <ProcessedText text={roleText} data={data} inline />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 双行显示模式
  if (enableDualRow) {
    return (
      <RowGrid>
        {/* 第一行：占据 areas 1-6 */}
        <GridItem areas={[1, 2, 3, 4, 5, 6]} width={ratio * 2} height={0.5}>
          {renderTestimonial(quote, author, role, avatarUrl, avatarData)}
        </GridItem>

        {/* 第二行：占据 areas 7-12 */}
        <GridItem areas={[7, 8, 9, 10, 11, 12]} width={ratio * 2} height={0.5}>
          {renderTestimonial(
            quote2 || quote,
            author2 || author,
            role2 || role,
            avatar2Url || avatarUrl,
            avatar2Data || avatarData,
          )}
        </GridItem>
      </RowGrid>
    );
  }

  // 单行显示模式
  return (
    <RowGrid>
      <GridItem areas={createArray(1, 12)} width={ratio} height={0.5}>
        {renderTestimonial(quote, author, role, avatarUrl, avatarData)}
      </GridItem>
    </RowGrid>
  );
}
