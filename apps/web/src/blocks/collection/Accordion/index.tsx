"use client";

import type {
  AccordionBlockConfig,
  AccordionData,
} from "@/blocks/collection/Accordion/types";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import Link from "@/components/ui/Link";
import ParallaxImageCarousel from "@/components/ui/ParallaxImageCarousel";
import { useMobile } from "@/hooks/use-mobile";
import { createArray } from "@/lib/client/create-array";

/**
 * AccordionBlock - 手风琴列表组件
 * 用于展示标签、分类等内容的网格布局
 */
export default function AccordionBlock({
  config,
}: {
  config: AccordionBlockConfig;
}) {
  const data = (config.data as AccordionData) || {};
  const { items = [] } = data;
  const isMobile = useMobile();

  // 根据 limit 限制显示数量
  const limit = config.content.limit ?? 0;
  const displayItems = limit > 0 ? items.slice(0, limit) : items;

  // 固定使用 3/12 宽度，与 categories 页面一致
  const itemWidth = 3 / 12;

  return (
    <RowGrid>
      {displayItems.map((item) => (
        <GridItem
          key={item.slug}
          areas={createArray(1, 12)}
          width={itemWidth}
          height={itemWidth}
          fixedHeight
          className="overflow-hidden block relative group"
        >
          <Link
            href={`/${data.source === "tags" ? "tags" : data.source}/${item.slug}`}
            className="h-full block relative"
          >
            <ParallaxImageCarousel
              images={item.featuredImage || []}
              alt={`${item.name} 展示`}
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
                  {/* 移动端：计数和名称重叠 */}
                  <div className="text-8xl text-foreground/10 transition-all duration-300 ease-out group-hover:text-foreground/40">
                    {item.postCount}
                  </div>
                  <h2
                    className="absolute text-4xl text-foreground transition-all duration-300 ease-out tracking-[0.1em] group-hover:scale-105"
                    data-fade-char
                  >
                    {item.name}
                  </h2>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="text-5xl opacity-0">
                      <div>{item.postCount}</div>
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
                      {item.name}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    <div className="text-5xl text-foreground/20 transition-all duration-300 ease-out group-hover:text-foreground/50">
                      <div>{item.postCount}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Link>
        </GridItem>
      ))}
    </RowGrid>
  );
}
