import RowGrid, { GridItem, type GridArea } from "@/components/RowGrid";
import LinkButton from "@/components/LinkButton";
import { replacePlaceholders } from "../lib/shared";
import { ProcessedText } from "../components";
import type { DefaultBlockConfig } from "./types";

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

  return (
    <RowGrid>
      {/* Header */}
      {hasHeader && (
        <GridItem
          areas={[1]}
          width={14}
          height={0.1}
          className="bg-primary text-primary-foreground flex items-center px-10 uppercase text-2xl h-full"
        >
          <ProcessedText text={content.header} data={data} inline />
        </GridItem>
      )}

      {/* Main Content */}
      <GridItem
        areas={areas}
        width={14 / areas.length}
        height={1}
        className="px-10 py-15 text-2xl flex flex-col justify-between"
      >
        <div>
          <div className="text-7xl" data-fade-char>
            <p>
              <ProcessedText text={content.title} data={data} inline />
            </p>
          </div>
          <div className="block mt-4" data-line-reveal>
            {content.content?.top.map((line: string, index: number) => (
              <div key={`content-top-${index}`}>
                <ProcessedText text={line} data={data} inline />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mt-10">
            {content.content?.bottom.map((line: string, index: number) => (
              <div key={`content-bottom-${index}`} data-fade-char>
                <ProcessedText text={line} data={data} inline />
              </div>
            ))}
          </div>
        </div>
      </GridItem>

      {/* Footer */}
      {hasFooter && (
        <GridItem
          areas={[12]}
          width={14}
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
