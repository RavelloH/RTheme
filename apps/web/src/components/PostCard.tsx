import {
  RiEye2Line,
  RiFolder2Line,
  RiPriceTagLine,
  RiPushpin2Fill,
  RiTimeLine,
} from "@remixicon/react";
import Link from "./Link";
import CMSImage from "./CMSImage";

interface PostCardProps {
  title: string;
  slug?: string;
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
  summary?: string;
  isPinned?: boolean;
  className?: string;
}

export default function PostCard({
  title,
  slug,
  date,
  category,
  tags,
  cover,
  summary,
  isPinned = false,
  className = "",
}: PostCardProps) {
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
    <div className={`h-full w-full relative group ${className}`}>
      {/* 延伸链接，使整个卡片可点击 */}
      <Link href={"/posts/" + slug} className="absolute inset-0 z-15">
        <span className="sr-only">{title}</span>
      </Link>

      {/* 置顶标识 */}
      {isPinned && (
        <div className="absolute top-0 left-0 z-30 pointer-events-none">
          <div className="relative">
            {/* 三角形背景 */}
            <div className="w-0 h-0 border-t-[4em] border-r-[4em] border-t-primary border-r-transparent" />
            {/* 置顶文本 */}
            <div className="absolute top-0 left-0 transform -rotate-45 origin-center">
              <span className="text-primary-foreground text-xs font-bold mt-[6px] ml-[6px] inline-block whitespace-nowrap">
                <RiPushpin2Fill size={"2em"} />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 背景图片 */}
      {coverImage && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            <CMSImage
              src={coverImage.url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              optimized={!!(coverImage.width && coverImage.height)}
              width={coverImage.width}
              height={coverImage.height}
              blur={coverImage.blur}
              priority={false}
            />
          </div>

          {/* 遮罩层，确保文字可读性 */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40 z-10 opacity-100 transition-opacity duration-500 group-hover:opacity-90 pointer-events-none" />
        </>
      )}

      {/* 内容区域 */}
      <div className="relative z-20 pl-10 pr-12 h-full flex flex-col justify-center pointer-events-none">
        <div className="text-3xl text-white group-hover:text-white transition-colors duration-300 relative">
          <span className="relative inline box-decoration-clone bg-[linear-gradient(white,white)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]">
            {title}
          </span>
        </div>
        <div className="text-xl line-clamp-1 py-2 flex items-center text-white/90">
          {date && (
            <span className="flex items-center gap-1 pr-3" data-fade>
              <RiTimeLine size={"1em"} />
              <span>{formatDate(date)}</span>
            </span>
          )}
          {category?.length !== 0 && (
            <span className="flex items-center gap-1" data-fade>
              <RiFolder2Line size={"1em"} />
              <span>
                {category?.map((cat, index) => (
                  <span key={cat.slug}>
                    <Link
                      href={`/categories/${cat.slug}`}
                      className="hover:text-primary transition-colors text-white pointer-events-auto relative z-30"
                      data-fade
                    >
                      {cat.name}
                    </Link>
                    {index < category.length - 1 && " / "}
                  </span>
                ))}
              </span>
            </span>
          )}
          {/* 访问量与标签的hover切换（桌面版） */}
          <span className="relative ml-3 hidden md:inline-block" data-fade>
            {summary && tags?.length !== 0 ? (
              <>
                {/* 访问量（默认显示，hover时消失） */}
                <span className="inline-flex items-center gap-1 absolute left-0 top-0 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-2">
                  <span
                    className="flex items-center gap-1 opacity-0 transition-all"
                    data-viewcount-slug={slug}
                  >
                    <RiEye2Line size={"1em"} />
                    <span>---</span>
                  </span>
                </span>
                {/* 标签（hover时出现） */}
                <span
                  className="inline-flex items-center gap-1 opacity-0 transition-all duration-300 group-hover:opacity-100
                  transform translate-y-2 group-hover:translate-y-0
                  [transform-style:preserve-3d] group-hover:[transform:perspective(1000px)_translateY(0)_rotateX(0deg)]
                  [transform:perspective(1000px)_translateY(8px)_rotateX(15deg)]"
                >
                  <RiPriceTagLine size={"1em"} />
                  {tags?.map((tag, index) => (
                    <span key={tag.slug}>
                      <Link
                        href={`/tags/${tag.slug}`}
                        className="hover:text-primary transition-colors text-white pointer-events-auto relative z-30"
                      >
                        #{tag.name}
                      </Link>
                      {index < tags.length - 1 && " "}
                    </span>
                  ))}
                </span>
              </>
            ) : (
              /* 没有标签时，常态显示访问量 */
              <span className="inline-flex items-center gap-1" data-fade>
                <span
                  className="flex items-center gap-1 opacity-0 transition-all"
                  data-viewcount-slug={slug}
                >
                  <RiEye2Line size={"1em"} />
                  <span>---</span>
                </span>
              </span>
            )}
          </span>
        </div>
        {/* 移动版：标签和摘要同时显示 */}
        <div className="md:hidden">
          {tags?.length !== 0 && (
            <div className="text-xl text-white/90 h-8">
              <span className="flex items-center gap-1">
                <RiPriceTagLine size={"1em"} data-fade />
                {tags?.map((tag, index) => (
                  <span key={tag.slug}>
                    <Link
                      href={`/tags/${tag.slug}`}
                      className="hover:text-primary transition-colors text-white pointer-events-auto relative z-30"
                      data-fade-word
                    >
                      #{tag.name}
                    </Link>
                    {index < tags.length - 1 && " "}
                  </span>
                ))}
              </span>
            </div>
          )}
          {summary && (
            <div className="text-lg text-white/90 pt-2">
              <div className="line-clamp-1">{summary}</div>
            </div>
          )}
        </div>

        {/* 桌面版：hover切换效果 */}
        <div className="hidden md:block relative h-8">
          {summary && tags?.length !== 0 && (
            <>
              <div className="text-xl text-white/90 absolute inset-0 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-2">
                <span className="flex items-center gap-1">
                  <RiPriceTagLine size={"1em"} data-fade />
                  {tags?.map((tag, index) => (
                    <span key={tag.slug}>
                      <Link
                        href={`/tags/${tag.slug}`}
                        className="hover:text-primary transition-colors text-white pointer-events-auto relative z-30"
                        data-fade-word
                      >
                        #{tag.name}
                      </Link>
                      {index < tags.length - 1 && " "}
                    </span>
                  ))}
                </span>
              </div>
              <div className="text-lg text-white/90 absolute inset-0 transition-all duration-300 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0">
                <div className="line-clamp-1">{summary}</div>
              </div>
            </>
          )}
          {/* 如果没有summary，正常显示标签 */}
          {!summary && tags?.length !== 0 && (
            <div className="text-xl text-white/90">
              <span className="flex items-center gap-1">
                <RiPriceTagLine size={"1em"} data-fade />
                {tags?.map((tag, index) => (
                  <span key={tag.slug}>
                    <Link
                      href={`/tags/${tag.slug}`}
                      className="hover:text-primary transition-colors text-white pointer-events-auto relative z-30"
                      data-fade-word
                    >
                      #{tag.name}
                    </Link>
                    {index < tags.length - 1 && " "}
                  </span>
                ))}
              </span>
            </div>
          )}
          {/* 只有summary没有标签的情况 */}
          {summary && !tags?.length && (
            <div className="text-lg text-white/90">
              <div className="line-clamp-1">{summary}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
