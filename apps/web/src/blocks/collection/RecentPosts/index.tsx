import Marquee from "react-fast-marquee";
import { RiArrowRightSLine } from "@remixicon/react";

import type {
  PostsBlockContent,
  PostsData,
} from "@/blocks/collection/RecentPosts/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { replacePlaceholders as replaceFn } from "@/blocks/core/lib";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import type { GridArea } from "@/components/client/layout/RowGrid";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import ViewCountBatchLoader from "@/components/client/logic/ViewCountBatchLoader";
import EmptyPostCard from "@/components/server/features/posts/EmptyPostCard";
import PostCard from "@/components/server/features/posts/PostCard";
import Link from "@/components/ui/Link";

const AREA_SLOTS: GridArea[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [10, 11, 12],
];

export default function PostsBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<PostsData>(block.runtime);
  const content = (block.content as PostsBlockContent) || {};
  const { displayPosts = [] } = data;
  const columns = content.layout?.columns || "2";

  // 提取配置
  const titleLine1 = content.title?.line1;
  const titleLine2 = content.title?.line2;
  const footerTitle = content.footer?.title;
  const footerDesc = content.footer?.description;
  const footerLink = content.footer?.link;

  // 与 PagedPosts 保持一致：缺失数据时补位 EmptyPostCard
  const targetPostCountMap: Record<string, number> = {
    "1": 1,
    "2": 5,
    "3": 9,
    "4": 13,
  };
  const targetPostCount = targetPostCountMap[columns] ?? displayPosts.length;
  const postsWithFallback = Array.from(
    { length: Math.max(displayPosts.length, targetPostCount) },
    (_, index) => displayPosts[index],
  );

  // 替换占位符
  const replacePlaceholders = (text: string): string => {
    return replaceFn(text, data);
  };

  // 计算 Grid Area
  // Marquee 占用前两个位置 (0, 1)
  // 文章从位置 2 开始
  const getArea = (index: number): GridArea[] => {
    // 偏移量为 2 (Marquee 1 & 2)
    const pos = (index + 2) % 4;
    return AREA_SLOTS[pos]!;
  };

  return (
    <RowGrid>
      {/* 标题 Marquee 1 - 占用 Pos 0 */}
      {titleLine1 && (
        <GridItem
          areas={AREA_SLOTS[0]!}
          width={4}
          className="flex items-center uppercase bg-primary text-primary-foreground"
        >
          <Marquee speed={40} autoFill={true} className="h-full text-7xl">
            {replacePlaceholders(titleLine1)}&nbsp;&nbsp;/&nbsp;&nbsp;
          </Marquee>
        </GridItem>
      )}

      {/* 标题 Marquee 2 - 占用 Pos 1 */}
      {titleLine2 && (
        <GridItem
          areas={AREA_SLOTS[1]!}
          width={4}
          className="flex items-center uppercase"
        >
          <Marquee
            speed={40}
            direction="right"
            autoFill={true}
            className="h-full text-7xl"
          >
            {replacePlaceholders(titleLine2)}&nbsp;&nbsp;/&nbsp;&nbsp;
          </Marquee>
        </GridItem>
      )}

      {/* 文章列表 */}
      {postsWithFallback.map((post, index) => {
        const currentAreas = getArea(index);

        return (
          <GridItem
            key={post?.slug ?? `empty-${index}`}
            areas={currentAreas}
            width={4}
            height={0.4}
            className=""
          >
            {post ? (
              <PostCard
                title={post.title}
                slug={post.slug}
                isPinned={post.isPinned}
                date={
                  post.publishedAt
                    ? new Date(post.publishedAt)
                        .toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                        .replace(/\//g, "/")
                    : ""
                }
                category={post.categories}
                tags={post.tags}
                cover={post.cover}
                summary={post.excerpt ?? ""}
              />
            ) : (
              <EmptyPostCard direction={index % 2 === 0 ? "left" : "right"} />
            )}
          </GridItem>
        );
      })}

      {/* 查看全部文章 - 占用文章后的下一个位置 */}
      {footerTitle && footerLink && (
        <GridItem
          areas={getArea(postsWithFallback.length)}
          width={4}
          height={0.4}
          className="uppercase "
        >
          <Link
            href={footerLink}
            className="flex items-center justify-between group px-10 py-15 h-full"
          >
            <div className="block" data-line-reveal>
              <div className="text-4xl text-foreground relative inline box-decoration-clone bg-[linear-gradient(currentColor,currentColor)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]">
                {replacePlaceholders(footerTitle)}
              </div>
              {footerDesc && (
                <div className="text-2xl">
                  {replacePlaceholders(footerDesc)}
                </div>
              )}
            </div>
            <div className="relative w-20 h-20">
              <RiArrowRightSLine
                size={"5em"}
                className="absolute top-0 left-0 transition-transform duration-300 ease-out group-hover:-translate-x-8"
              />
              <RiArrowRightSLine
                size={"5em"}
                className="absolute top-0 left-0 transition-transform duration-300 ease-out group-hover:-translate-x-16 "
              />
              <RiArrowRightSLine
                size={"5em"}
                className="absolute top-0 left-0 transition-transform duration-300 ease-out group-hover:-translate-x-24"
              />
            </div>
          </Link>
        </GridItem>
      )}

      <ViewCountBatchLoader />
    </RowGrid>
  );
}
