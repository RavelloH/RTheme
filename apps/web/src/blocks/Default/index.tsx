import RowGrid, { GridItem, type GridArea } from "@/components/RowGrid";
import LinkButton from "@/components/LinkButton";
import type { BlockConfig } from "@/blocks/types";

interface DefaultBlockData {
  [key: string]: unknown;
}

/**
 * DefaultBlock - 服务端组件
 * 显示可配置的内容块，支持占位符插值
 */
export default function DefaultBlock({ config }: { config: BlockConfig }) {
  const data = (config.data as DefaultBlockData) || {};
  const { content } = config;

  const hasHeader = !!content.header?.value;
  const hasFooter = !!(
    content.footer?.value.link || content.footer?.value.description
  );

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

  // 替换占位符
  const replacePlaceholders = (text: string): string => {
    if (!text) return "";
    return text.replace(/\{(\w+)\}/g, (match, key) => {
      if (!data) return match;
      return data[key] !== undefined ? String(data[key]) : match;
    });
  };

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
          <span>{replacePlaceholders(content.header?.value || "")}</span>
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
            <p>{replacePlaceholders(content.title?.value || "")}</p>
          </div>
          <div className="block mt-4" data-line-reveal>
            {content.content?.value.top.map((line: string, index: number) => (
              <div key={`content-top-${index}`}>
                {replacePlaceholders(line) || " "}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="mt-10">
            {content.content?.value.bottom.map(
              (line: string, index: number) => (
                <div key={`content-bottom-${index}`} data-fade-char>
                  {replacePlaceholders(line) || " "}
                </div>
              ),
            )}
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
            href={replacePlaceholders(content.footer?.value.link || "")}
            text={replacePlaceholders(content.footer?.value.description || "")}
          />
        </GridItem>
      )}
    </RowGrid>
  );
}
