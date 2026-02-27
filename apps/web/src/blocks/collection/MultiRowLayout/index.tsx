import type { CSSProperties } from "react";
import Marquee from "react-fast-marquee";

import type {
  MultiRowLayoutBlockConfig,
  MultiRowLayoutData,
  RowConfig,
} from "@/blocks/collection/MultiRowLayout/types";
import { ProcessedText } from "@/blocks/core/components";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, {
  type GridArea,
  GridItem,
} from "@/components/client/layout/RowGrid";
import ParallaxImageCarousel from "@/components/ui/ParallaxImageCarousel";
import type { ProcessedImageData } from "@/lib/shared/image-common";

type RowKey = `row${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;
type RowType = NonNullable<RowConfig["type"]>;
type RowCount = 1 | 2 | 3 | 4 | 6 | 12;

const ROW_COUNT_VALUES: readonly RowCount[] = [1, 2, 3, 4, 6, 12];

const ROW_LAYOUTS: Record<RowCount, { rows: RowKey[]; areas: GridArea[][] }> = {
  1: { rows: ["row1"], areas: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]] },
  2: {
    rows: ["row1", "row2"],
    areas: [
      [1, 2, 3, 4, 5, 6],
      [7, 8, 9, 10, 11, 12],
    ],
  },
  3: {
    rows: ["row1", "row2", "row3"],
    areas: [
      [1, 2, 3, 4],
      [5, 6, 7, 8],
      [9, 10, 11, 12],
    ],
  },
  4: {
    rows: ["row1", "row2", "row3", "row4"],
    areas: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12],
    ],
  },
  6: {
    rows: ["row1", "row2", "row3", "row4", "row5", "row6"],
    areas: [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
      [11, 12],
    ],
  },
  12: {
    rows: [
      "row1",
      "row2",
      "row3",
      "row4",
      "row5",
      "row6",
      "row7",
      "row8",
      "row9",
      "row10",
      "row11",
      "row12",
    ],
    areas: [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10], [11], [12]],
  },
};

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function parseRowCount(rowCount: unknown): RowCount {
  const normalized = Number(rowCount);
  if (ROW_COUNT_VALUES.includes(normalized as RowCount)) {
    return normalized as RowCount;
  }
  return 3;
}

function resolveRowType(type: RowConfig["type"]): RowType {
  if (type === "image" || type === "marquee") return type;
  return "text";
}

function getTextColorClass(color?: string): string {
  const colorMap: Record<string, string> = {
    default: "text-foreground",
    muted: "text-muted-foreground",
    primary: "text-primary",
    background: "text-background",
  };
  return colorMap[color ?? "default"] ?? "text-foreground";
}

function getImageTextColorClass(color?: string): string {
  if (!color || color === "default") return "text-foreground";
  return getTextColorClass(color);
}

function getBackgroundColorClass(color?: string): string {
  const colorMap: Record<string, string> = {
    default: "bg-background",
    muted: "bg-muted",
    primary: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    transparent: "bg-transparent",
  };
  return colorMap[color ?? "default"] ?? "bg-background";
}

function getPaddingClass(padding?: string): string {
  const paddingMap: Record<string, string> = {
    none: "p-0",
    sm: "p-4",
    md: "p-6 md:p-8",
    lg: "p-8 md:p-10",
    xl: "p-10 md:p-12",
  };
  return paddingMap[padding ?? "md"] ?? "p-6 md:p-8";
}

function getHorizontalAlignClass(align?: string): string {
  const alignMap: Record<string, string> = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  };
  return alignMap[align ?? "left"] ?? "items-start text-left";
}

function getVerticalAlignClass(align?: string): string {
  const alignMap: Record<string, string> = {
    top: "justify-start",
    center: "justify-center",
    bottom: "justify-end",
  };
  return alignMap[align ?? "center"] ?? "justify-center";
}

function getTextAnimationAttr(
  animation?: string,
): Record<string, string> | undefined {
  if (!animation || animation === "none") return undefined;
  return { [`data-${animation}`]: "" };
}

function getTextSizeClass(rowCount: RowCount): string {
  if (rowCount >= 12) return "text-sm md:text-base";
  if (rowCount >= 6) return "text-sm md:text-base lg:text-lg";
  if (rowCount >= 4) return "text-base md:text-lg";
  return "text-base md:text-lg lg:text-xl";
}

function getMobileHeight(rowType: RowType, rowCount: RowCount): number {
  if (rowType === "image") return rowCount >= 6 ? 0.75 : 0.9;
  if (rowType === "marquee") return 0.2;
  if (rowCount >= 12) return 0.2;
  if (rowCount >= 6) return 0.28;
  if (rowCount >= 4) return 0.36;
  return 0.48;
}

function renderTextRow(
  rowConfig: RowConfig,
  data: MultiRowLayoutData,
  rowCount: RowCount,
) {
  const textColorClass = getTextColorClass(rowConfig.textColor);
  const bgColorClass = getBackgroundColorClass(rowConfig.backgroundColor);
  const paddingClass = getPaddingClass(rowConfig.padding);
  const horizontalAlignClass = getHorizontalAlignClass(
    rowConfig.horizontalAlign,
  );
  const verticalAlignClass = getVerticalAlignClass(rowConfig.verticalAlign);
  const textAnimation = rowConfig.textAnimation ?? "line-reveal";
  const animationAttr = getTextAnimationAttr(textAnimation);
  const textSizeClass = getTextSizeClass(rowCount);
  const lines = rowConfig.content ?? [];
  const lineClassName = `${textSizeClass} leading-relaxed`;

  return (
    <div
      className={`flex h-full w-full flex-col ${paddingClass} ${bgColorClass} ${horizontalAlignClass} ${verticalAlignClass} ${textColorClass}`}
    >
      <div className="w-full space-y-1">
        {textAnimation === "line-reveal" ? (
          <div className={lineClassName} {...animationAttr}>
            {lines.map((line, lineIndex) => (
              <div key={`multi-row-line-${lineIndex}`}>
                <ProcessedText text={line ?? ""} data={data} inline />
              </div>
            ))}
          </div>
        ) : (
          lines.map((line, lineIndex) => (
            <div
              key={`multi-row-text-${lineIndex}`}
              className={lineClassName}
              {...animationAttr}
            >
              <ProcessedText text={line ?? ""} data={data} inline />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function renderImageRow(
  rowKey: RowKey,
  rowConfig: RowConfig,
  data: MultiRowLayoutData,
) {
  const textColorClass = getImageTextColorClass(rowConfig.textColor);
  const bgColorClass = getBackgroundColorClass(rowConfig.backgroundColor);
  const horizontalAlignClass = getHorizontalAlignClass(
    rowConfig.horizontalAlign,
  );

  const processedImages = data[rowKey] as ProcessedImageData[] | undefined;
  const images = processedImages?.length
    ? processedImages
    : (rowConfig.images ?? []).map((url) => ({ url: url ?? "" }));

  return (
    <div className={`relative h-full w-full overflow-hidden ${bgColorClass}`}>
      {images.length > 0 ? (
        <ParallaxImageCarousel
          images={images}
          alt={rowConfig.title ?? "Multi row image"}
        />
      ) : (
        <div className="h-full w-full bg-muted" />
      )}

      <div
        className={`absolute inset-0 z-10 flex h-full flex-col justify-end p-15 pointer-events-none ${horizontalAlignClass}`}
      >
        {rowConfig.title ? (
          <div className={`text-3xl md:text-4xl lg:text-5xl ${textColorClass}`}>
            <div data-fade-char>
              <ProcessedText
                text={rowConfig.title}
                data={data}
                inline
                disableMarkdown
              />
            </div>
          </div>
        ) : null}

        {rowConfig.description ? (
          <div
            className={`text-base md:text-xl ${textColorClass}`}
            data-fade-char
          >
            <ProcessedText
              text={rowConfig.description}
              data={data}
              inline
              disableMarkdown
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function renderMarqueeRow(rowConfig: RowConfig) {
  const bgColorClass = getBackgroundColorClass(rowConfig.backgroundColor);
  const textColorClass = getTextColorClass(rowConfig.textColor);
  const content = rowConfig.marqueeContent?.trim() || "MULTI ROW LAYOUT";
  const direction = rowConfig.marqueeDirection ?? "left";
  const speed = clamp(Number(rowConfig.marqueeSpeed ?? 40), 10, 120);

  return (
    <div
      className={`flex h-full w-full items-center overflow-hidden uppercase ${bgColorClass} ${textColorClass}`}
    >
      <Marquee
        speed={speed}
        direction={direction === "right" ? "right" : "left"}
        autoFill
        className="h-full py-2 text-2xl md:text-4xl lg:text-6xl"
      >
        {content}&nbsp;&nbsp;/&nbsp;&nbsp;
      </Marquee>
    </div>
  );
}

function renderRowContent(
  rowKey: RowKey,
  rowType: RowType,
  rowConfig: RowConfig,
  data: MultiRowLayoutData,
  rowCount: RowCount,
) {
  switch (rowType) {
    case "image":
      return renderImageRow(rowKey, rowConfig, data);
    case "marquee":
      return renderMarqueeRow(rowConfig);
    case "text":
    default:
      return renderTextRow(rowConfig, data, rowCount);
  }
}

export default function MultiRowLayoutBlock({ block }: BlockComponentProps) {
  const content = block.content as MultiRowLayoutBlockConfig["content"];
  const data = getBlockRuntimeData<MultiRowLayoutData>(block.runtime);

  const rowCount = parseRowCount(content.rowCount);
  const rowLayout = ROW_LAYOUTS[rowCount];
  const ratio = clamp(Number(content.layout?.ratio ?? 1), 0.4, 3);
  const gap = clamp(Number(content.layout?.gap ?? 0), 0, 48);
  const rowGridStyle: CSSProperties | undefined =
    gap > 0 ? { gap: `${gap}px` } : undefined;

  return (
    <RowGrid style={rowGridStyle}>
      {rowLayout.rows.map((rowKey, index) => {
        const rowData =
          (content[rowKey as keyof typeof content] as RowConfig | undefined) ||
          {};
        const rowType = resolveRowType(rowData.type);
        const areas = rowLayout.areas[index];

        if (!areas) return null;

        const width = (12 / areas.length) * ratio;
        const isImageRow = rowType === "image";

        return (
          <GridItem
            key={rowKey}
            areas={areas}
            width={width}
            height={isImageRow ? undefined : getMobileHeight(rowType, rowCount)}
            className={
              rowType === "image" ? "overflow-hidden block relative" : ""
            }
            fixedHeight={rowType !== "text"}
          >
            {renderRowContent(rowKey, rowType, rowData, data, rowCount)}
          </GridItem>
        );
      })}
    </RowGrid>
  );
}
