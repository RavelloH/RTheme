import TimelineClient from "@/blocks/collection/Timeline/client/TimelineClient";
import type {
  TimelineConnectionMode,
  TimelineItemBlockConfig,
  TimelineItemData,
} from "@/blocks/collection/Timeline/types";
import { ProcessedText } from "@/blocks/core/components";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import CMSImage from "@/components/ui/CMSImage";
import Link from "@/components/ui/Link";

/**
 * TimelineItemBlock - 服务端组件
 * 展示单个时间线节点
 */
export default function TimelineItemBlock({ block }: BlockComponentProps) {
  const content = block.content as TimelineItemBlockConfig["content"];
  const data = getBlockRuntimeData<TimelineItemData>(block.runtime);

  const year = content.year || "";
  const monthDay = content.monthDay || "";
  const title = content.title || "";
  const description = content.description || "";
  const imageUrl = content.image || "";
  const link = content.link || "";
  const imageData = data.imageData;

  const ratio = content.layout?.ratio ?? 0.4;
  const swapPosition = content.layout?.swapPosition ?? false;
  const incomplete = content.layout?.incomplete ?? false;
  const connectionMode: TimelineConnectionMode =
    content.layout?.connectionMode ?? "standalone";

  // 获取图片数据
  const imageSrc = imageData?.url || imageUrl;

  // 颜色类：根据 incomplete 状态使用不同颜色
  const incompleteColorClass = incomplete
    ? "text-muted-foreground/30"
    : "text-primary/80";
  const yearColorClass = incomplete
    ? "text-muted-foreground/30"
    : "text-primary/80";
  const bgClass = incomplete ? "bg-muted-foreground/20" : "bg-primary";
  const linkColorClass = incomplete ? "text-muted-foreground" : "text-primary";

  // 预渲染标题元素
  const titleElement = title ? (
    <h3 className="text-lg md:text-2xl font-medium mb-2" data-fade-char>
      <ProcessedText text={title} data={data} inline />
    </h3>
  ) : null;

  // 预渲染描述元素
  const descriptionElement = description ? (
    <p
      className="text-base md:text-lg text-muted-foreground mb-4"
      data-line-reveal
    >
      <ProcessedText text={description} data={data} inline />
    </p>
  ) : null;

  // 预渲染图片元素
  const imageElement = imageSrc ? (
    <div className="overflow-hidden relative h-32 md:h-40">
      <CMSImage
        src={imageSrc}
        alt={title || ""}
        fill
        width={imageData?.width}
        height={imageData?.height}
        blur={imageData?.blur}
        className="object-cover"
      />
    </div>
  ) : null;

  // 预渲染链接元素
  const linkElement = link ? (
    <Link href={link} className={`mt-4 ${linkColorClass} hover:underline`}>
      了解更多 →
    </Link>
  ) : null;

  return (
    <TimelineClient
      year={year}
      monthDay={monthDay}
      ratio={ratio}
      swapPosition={swapPosition}
      connectionMode={connectionMode}
      yearColorClass={yearColorClass}
      incompleteColorClass={incompleteColorClass}
      bgClass={bgClass}
      titleElement={titleElement}
      descriptionElement={descriptionElement}
      imageElement={imageElement}
      linkElement={linkElement}
    />
  );
}
