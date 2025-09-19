import { RiFolder2Line, RiPriceTagLine, RiTimeLine } from "@remixicon/react";

interface PostCardProps {
  title: string;
  date: string;
  category: string[];
  tags: string[];
  className?: string;
}

export default function PostCard({
  title,
  date,
  category,
  tags,
  className = "",
}: PostCardProps) {
  return (
    <div className={`px-10 py-15 block ${className}`}>
      <div className="text-3xl" data-fade-char>
        {title}
      </div>
      <div className="text-xl line-clamp-1 py-2 flex items-center">
        <span className="flex items-center gap-1 pr-3">
          <RiTimeLine />
          {date}
        </span>
        <span className="flex items-center gap-1">
          <RiFolder2Line />
          <span data-fade-word>{category.join(" / ")}</span>
        </span>
      </div>
      <div className="text-xl">
        <span className="flex items-center gap-1">
          <RiPriceTagLine />
          {tags.map((tag, index) => (
            <span key={index} data-fade-word>
              #{tag}
              {index < tags.length - 1 && " "}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
