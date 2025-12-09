import {
  RiFolder2Line,
  RiPriceTagLine,
  RiTimeLine,
  RiArrowLeftLine,
  RiArrowRightLine,
} from "@remixicon/react";
import Link from "./Link";
import CMSImage from "./CMSImage";

interface AdjacentPostCardProps {
  title: string;
  slug: string;
  date?: string;
  category?: { name: string; slug: string }[];
  tags?: { name: string; slug: string }[];
  cover?:
    | Array<{
        url: string;
        width?: number;
        height?: number;
        blur?: string;
      }>
    | string;
  direction: "previous" | "next";
}

export default function AdjacentPostCard({
  title,
  slug,
  date,
  category,
  tags,
  cover,
  direction,
}: AdjacentPostCardProps) {
  // 格式化日期显示
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // 处理封面图片数据
  const coverImage = Array.isArray(cover)
    ? cover[0]
    : cover
      ? { url: cover }
      : null;

  return (
    <Link href={"/posts/" + slug} className="h-full w-full">
      <div className="h-full w-full relative group overflow-hidden">
        {/* 背景图片 */}
        {coverImage && (
          <>
            <div className="absolute inset-0">
              <CMSImage
                src={coverImage.url}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                optimized={!!(coverImage.width && coverImage.height)}
                width={coverImage.width}
                height={coverImage.height}
                blur={coverImage.blur}
                priority={false}
              />
            </div>

            {/* 遮罩层 */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40 z-10 transition-opacity duration-300 group-hover:opacity-90" />
          </>
        )}

        {/* 内容区域 */}
        <div
          className={`relative z-20 px-8 py-6 h-full flex flex-col justify-end ${
            direction === "next" ? "items-end" : "items-start"
          }`}
        >
          {/* 方向指示 */}
          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            {direction === "previous" ? (
              <>
                <RiArrowLeftLine size={"1em"} />
                <span>上一篇</span>
              </>
            ) : (
              <>
                <span>下一篇</span>
                <RiArrowRightLine size={"1em"} />
              </>
            )}
          </div>

          {/* 标题 */}
          <h3
            className={`text-xl md:text-2xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors line-clamp-2 ${
              direction === "next" ? "text-right" : "text-left"
            }`}
          >
            {title}
          </h3>

          {/* 元信息 */}
          <div className="text-sm flex flex-wrap gap-2 text-muted-foreground">
            {date && (
              <span className="flex items-center gap-1">
                <RiTimeLine size={"1em"} />
                <span>{formatDate(date)}</span>
              </span>
            )}
            {category && category.length > 0 && (
              <>
                {date && <span>·</span>}
                <span className="flex items-center gap-1">
                  <RiFolder2Line size={"1em"} />
                  <span>
                    {category.map((cat, index) => (
                      <span key={cat.slug}>
                        {cat.name}
                        {index < category.length - 1 && " / "}
                      </span>
                    ))}
                  </span>
                </span>
              </>
            )}
          </div>

          {/* 标签 */}
          {tags && tags.length > 0 && (
            <div
              className={`flex flex-wrap gap-1 mt-2 text-sm text-muted-foreground items-center ${
                direction === "next" ? "justify-end" : "justify-start"
              }`}
            >
              <RiPriceTagLine size={"1em"} />
              {tags.slice(0, 3).map((tag, index) => (
                <span key={tag.slug}>
                  #{tag.name}
                  {index < Math.min(tags.length, 3) - 1 && " "}
                </span>
              ))}
              {tags.length > 3 && <span>...</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
