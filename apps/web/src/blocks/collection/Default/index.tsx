import type { DefaultBlockConfig } from "@/blocks/collection/Default/types";
import { ProcessedText } from "@/blocks/core/components";
import {
  extractBlockSectionAndAlign,
  extractBlockTextAndAlign,
  replacePlaceholders,
} from "@/blocks/core/lib/shared";
import RowGrid, {
  type GridArea,
  GridItem,
} from "@/components/client/layout/RowGrid";
import LinkButton from "@/components/ui/LinkButton";

interface DefaultBlockData {
  [key: string]: unknown;
}

/**
 * DefaultBlock - 服务端组件
 * 显示可配置的内容块，支持占位符插值
 */
export default function DefaultBlock({
  config,
}: {
  config: DefaultBlockConfig;
}) {
  const data = (config.data as DefaultBlockData) || {};
  const { content } = config;

  // 获取布局配置
  const layout =
    (content.layout as { verticalCenter?: boolean; ratio?: number }) || {};
  const verticalCenter = layout.verticalCenter ?? false;
  const ratio = layout.ratio ?? 1;

  const hasHeader = !!content.header;
  const hasFooter = !!(content.footer?.link || content.footer?.text);

  // 根据是否有 header/footer 计算 areas
  const getAreas = (): GridArea[] => {
    if (hasHeader && hasFooter) {
      return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
    if (hasHeader) {
      return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }
    if (hasFooter) {
      return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  };

  const areas = getAreas();

  // 获取对齐类名
  const getAlignClass = (align?: string) => {
    switch (align) {
      case "center":
        return "justify-center text-center";
      case "right":
        return "justify-end text-right";
      case "left":
      default:
        return "justify-start text-left";
    }
  };

  return (
    <RowGrid>
      {/* Header */}
      {hasHeader &&
        (() => {
          const { text: headerText, align: headerAlign } =
            extractBlockTextAndAlign(content.header);
          return (
            <GridItem
              areas={[1]}
              width={14 * ratio}
              height={0.1}
              className={`bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full ${getAlignClass(
                headerAlign,
              )}`}
            >
              <ProcessedText text={headerText} data={data} inline />
            </GridItem>
          );
        })()}

      {/* Main Content */}
      <GridItem
        areas={areas}
        width={(14 * ratio) / areas.length}
        height={1}
        className={`px-10 py-15 text-2xl flex flex-col ${verticalCenter ? "justify-center" : "justify-between"}`}
      >
        <div>
          {(() => {
            const { text: titleText, align: titleAlign } =
              extractBlockTextAndAlign(content.title);
            return (
              <div
                className={`text-7xl ${getAlignClass(titleAlign)}`}
                data-fade-char
              >
                <p>
                  <ProcessedText text={titleText} data={data} inline />
                </p>
              </div>
            );
          })()}
          <div
            className={`block mt-4 ${getAlignClass(
              extractBlockSectionAndAlign(content.content?.top).align,
            )}`}
            data-line-reveal
          >
            {(() => {
              const { values: topValues } = extractBlockSectionAndAlign(
                content.content?.top,
              );
              return Array.isArray(topValues)
                ? topValues.map((item, index) => (
                    <div key={`content-top-${index}`}>
                      <ProcessedText text={item} data={data} inline />
                    </div>
                  ))
                : null;
            })()}
          </div>
        </div>
        <div>
          <div
            className={`mt-10 ${getAlignClass(
              extractBlockSectionAndAlign(content.content?.bottom).align,
            )}`}
            data-fade-char
          >
            {(() => {
              const { values: bottomValues } = extractBlockSectionAndAlign(
                content.content?.bottom,
              );
              return Array.isArray(bottomValues)
                ? bottomValues.map((item, index) => (
                    <div key={`content-bottom-${index}`}>
                      <ProcessedText text={item} data={data} inline />
                    </div>
                  ))
                : null;
            })()}
          </div>
        </div>
      </GridItem>

      {/* Footer */}
      {hasFooter && (
        <GridItem
          areas={[12]}
          width={14 * ratio}
          height={0.1}
          className="flex items-center uppercase text-2xl"
        >
          <LinkButton
            mode="link"
            href={replacePlaceholders(content.footer?.link ?? "", data)}
            text={
              <ProcessedText
                text={content.footer?.text}
                data={data}
                inline
                disableMarkdown
              />
            }
          />
        </GridItem>
      )}
    </RowGrid>
  );
}
