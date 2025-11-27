"use client";

import Link from "@/components/Link";
import ParallaxImageCarousel from "@/components/ParallaxImageCarousel";
import { GridItem } from "@/components/RowGrid";
import { useMobile } from "@/hooks/useMobile";
import { createArray } from "@/lib/client/createArray";

export default function TagContainer({
  tag,
}: {
  tag: {
    slug: string;
    name: string;
    description: string | null;
    featuredImage:
      | Array<{
          url: string;
          width?: number;
          height?: number;
          blur?: string;
        }>
      | string
      | null;
    postCount: number;
    createdAt: string;
    updatedAt: string;
  };
}) {
  const isMobile = useMobile();
  return (
    <GridItem
      key={tag.slug}
      areas={createArray(1, 12)}
      width={3 / 12}
      height={3 / 12}
      fixedHeight
      className="overflow-hidden block relative group"
    >
      <Link href={`/tags/${tag.slug}`} className="h-full block relative">
        <ParallaxImageCarousel
          images={
            Array.isArray(tag.featuredImage)
              ? tag.featuredImage
              : tag.featuredImage
                ? [{ url: tag.featuredImage }]
                : []
          }
          alt={`${tag.name} 标签展示`}
        />

        <div
          className={
            isMobile
              ? "absolute inset-0 z-10 flex items-center justify-center text-center"
              : "p-15 absolute inset-0 z-10 flex flex-col justify-between items-center text-center"
          }
        >
          {isMobile ? (
            <>
              {/* 移动端：标题和计数重叠在同一位置，标题在上层 */}
              <div className="text-8xl text-foreground/10 transition-all duration-300 ease-out group-hover:text-foreground/40">
                {tag.postCount}
              </div>
              <h2
                className="absolute text-4xl text-foreground transition-all duration-300 ease-out tracking-[0.1em] group-hover:scale-105"
                data-fade-char
              >
                {tag.name}
              </h2>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <div className="text-5xl opacity-0">
                  <div>{tag.postCount}</div>
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center">
                <h2
                  className="text-5xl text-foreground transition-all duration-300 ease-out tracking-[0.2em] group-hover:scale-110 group-hover:tracking-[0.4em]"
                  data-fade-char
                  style={{
                    writingMode: "vertical-rl",
                    textOrientation: "mixed",
                  }}
                >
                  {tag.name}
                </h2>
              </div>

              <div className="space-y-2">
                <div className="text-5xl text-foreground/20 transition-all duration-300 ease-out group-hover:text-foreground/50">
                  <div>{tag.postCount}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </Link>
    </GridItem>
  );
}
