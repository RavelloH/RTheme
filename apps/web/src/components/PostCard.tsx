import { RiFolder2Line, RiPriceTagLine, RiTimeLine } from "@remixicon/react";
import Image from "next/image";
import Link from "./Link";

interface PostCardProps {
  title: string;
  date: string;
  category: string[];
  tags: string[];
  cover?: string;
  className?: string;
}

export default function PostCard({
  title,
  date,
  category,
  tags,
  cover,
  className = "",
}: PostCardProps) {
  const defaultCover =
    "https://raw.ravelloh.top/20250205/Vampire-Survivors-2025_2_4-23_42_23.webp";

  return (
    <Link href={title}>
      <div className={`h-full w-full relative group ${className}`}>
        {/* 内容区域 - 现在覆盖整个容器 */}
        <div className="absolute inset-0 px-10 flex flex-col justify-center">
          <div className="text-3xl group-hover:text-white transition-colors duration-300 relative">
            <span className="relative inline-block">
              <span>{title}</span>
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current transform scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 ease-out"></span>
            </span>
          </div>
          <div className="text-xl line-clamp-1 py-2 flex items-center">
            <span className="flex items-center gap-1 pr-3">
              <RiTimeLine size={"1em"} data-fade />
              <span data-fade>{date}</span>
            </span>
            <span className="flex items-center gap-1">
              <RiFolder2Line size={"1em"} data-fade />
              <span data-fade-word>{category.join(" / ")}</span>
            </span>
          </div>
          <div className="text-xl">
            <span className="flex items-center gap-1">
              <RiPriceTagLine size={"1em"} data-fade />
              {tags.map((tag, index) => (
                <span key={index} data-fade-word>
                  #{tag}
                  {index < tags.length - 1 && " "}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* 右侧三角形图像区域 */}
        <div className="absolute right-0 top-0 h-full aspect-square opacity-50 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
          <Image
            src={cover || defaultCover}
            alt={title}
            width={200}
            height={200}
            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300 ease-out"
            style={{
              clipPath: "polygon(100% 0%, 100% 100%, 0% 100%)",
            }}
          />
        </div>
      </div>
    </Link>
  );
}
