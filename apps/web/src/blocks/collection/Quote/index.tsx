import { RiDoubleQuotesL, RiDoubleQuotesR } from "@remixicon/react";

import type { QuoteBlockConfig } from "@/blocks/collection/Quote/types";
import { ProcessedText } from "@/blocks/core/components";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";

/**
 * QuoteBlock - 服务端组件
 * 展示引用文本，支持多种样式
 */
export default function QuoteBlock({ config }: { config: QuoteBlockConfig }) {
  const { content } = config;
  const data = (config.data as Record<string, unknown>) || {};

  const quote = content.quote || "";
  const author = content.author || "";
  const source = content.source || "";
  const style = content.layout?.style || "classic";
  const align = content.layout?.align || "left";
  const ratio = content.layout?.ratio ?? 1;

  const alignClass =
    align === "center" ? "text-center items-center" : "text-left items-start";

  // 经典样式
  if (style === "classic") {
    return (
      <RowGrid>
        {/* 开引号装饰 */}
        <GridItem
          areas={[1, 2]}
          width={(ratio * 14) / 2}
          height={0.2}
          className={`flex text-center items-center justify-center px-10`}
        >
          <RiDoubleQuotesL className="w-20 h-20 text-primary opacity-30" />
        </GridItem>

        {/* 引用文本 */}
        <GridItem
          areas={[3, 4, 5, 6, 7, 8, 9, 10]}
          width={(ratio * 14) / 8}
          height={1}
          className={`flex flex-col ${alignClass} justify-center px-10`}
        >
          <blockquote
            className="text-4xl md:text-5xl italic leading-relaxed"
            data-fade-char
          >
            <ProcessedText text={quote} data={data} inline />
          </blockquote>
        </GridItem>

        {/* 作者和来源 */}
        <GridItem
          areas={[11, 12]}
          width={(ratio * 14) / 2}
          height={0.2}
          className={`flex flex-col ${alignClass} justify-center px-10 text-2xl text-muted-foreground`}
        >
          {author && (
            <div data-line-reveal>
              <span className="font-medium text-foreground">
                <ProcessedText text={author} data={data} inline />
              </span>
            </div>
          )}
          {source && (
            <div data-line-reveal className="mt-1 text-xl">
              <ProcessedText text={source} data={data} inline />
            </div>
          )}
        </GridItem>
      </RowGrid>
    );
  }

  // 现代样式
  if (style === "modern") {
    return (
      <RowGrid>
        {/* 主内容区域 */}
        <GridItem
          areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
          width={ratio}
          height={1}
          className={`flex flex-col ${alignClass} justify-center px-10 py-15 relative`}
        >
          {/* 背景引号装饰 */}
          <RiDoubleQuotesL className="absolute top-10 left-10 w-32 h-32 text-primary opacity-10" />
          <RiDoubleQuotesR className="absolute bottom-10 right-10 w-32 h-32 text-primary opacity-10" />

          {/* 引用文本 */}
          <blockquote
            className="text-3xl md:text-4xl leading-relaxed relative z-10"
            data-fade-char
          >
            <ProcessedText text={quote} data={data} inline />
          </blockquote>

          {/* 作者和来源 */}
          <div className={`mt-10 flex flex-col ${alignClass}`}>
            {author && (
              <div className="text-2xl font-medium" data-line-reveal>
                — <ProcessedText text={author} data={data} inline />
              </div>
            )}
            {source && (
              <div
                className="text-xl text-muted-foreground mt-2"
                data-line-reveal
              >
                <ProcessedText text={source} data={data} inline />
              </div>
            )}
          </div>
        </GridItem>
      </RowGrid>
    );
  }

  // 极简样式
  return (
    <RowGrid>
      <GridItem
        areas={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
        width={ratio}
        height={1}
        className={`flex flex-col ${alignClass} justify-center px-10 py-15`}
      >
        {/* 左侧装饰线 */}
        <div className={`flex ${align === "center" ? "justify-center" : ""}`}>
          <div
            className={`${align === "center" ? "" : "border-l-4 border-primary pl-8"}`}
          >
            {/* 引用文本 */}
            <blockquote
              className="text-3xl md:text-4xl leading-relaxed"
              data-fade-char
            >
              <ProcessedText text={quote} data={data} inline />
            </blockquote>

            {/* 作者和来源 */}
            {(author || source) && (
              <div
                className="mt-6 text-xl text-muted-foreground"
                data-line-reveal
              >
                {author && (
                  <span className="font-medium text-foreground">
                    <ProcessedText text={author} data={data} inline />
                  </span>
                )}
                {author && source && <span className="mx-2">·</span>}
                {source && <ProcessedText text={source} data={data} inline />}
              </div>
            )}
          </div>
        </div>
      </GridItem>
    </RowGrid>
  );
}
