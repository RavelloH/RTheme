import Marquee from "react-fast-marquee";
import { RiArrowRightSLine } from "@remixicon/react";

import { replacePlaceholders as replaceFn } from "@/blocks/lib";
import type { BlockConfig } from "@/blocks/types";
import ViewCountBatchLoader from "@/components/client/ViewCountBatchLoader";
import EmptyPostCard from "@/components/EmptyPostCard";
import Link from "@/components/Link";
import PostCard from "@/components/PostCard";
import type { GridArea } from "@/components/RowGrid";
import RowGrid, { GridItem } from "@/components/RowGrid";
import type { ProcessedImageData } from "@/lib/shared/image-common";

interface PostsData {
  displayPosts: Array<{
    title: string;
    slug: string;
    isPinned: boolean;
    publishedAt: string | Date | null;
    categories: { name: string; slug: string }[];
    tags: { name: string; slug: string }[];
    cover: ProcessedImageData[];
    excerpt?: string;
  }>;
  totalPosts: number;
  [key: string]: unknown;
}

export default function PostsBlock({ config }: { config: BlockConfig }) {
  const data = (config.data as PostsData) || {};
  const { displayPosts = [], totalPosts = 0 } = data;

  // 替换占位符
  const replacePlaceholders = (text: string): string => {
    return replaceFn(text, data);
  };

  return (
    <RowGrid>
      {/* 标题 Marquee */}
      <GridItem
        areas={[1, 2, 3]}
        width={4}
        className="flex items-center uppercase bg-primary text-primary-foreground"
      >
        <Marquee speed={40} autoFill={true} className="h-full text-7xl">
          {replacePlaceholders("POSTS")}&nbsp;&nbsp;/&nbsp;&nbsp;
        </Marquee>
      </GridItem>

      <GridItem
        areas={[4, 5, 6]}
        width={4}
        className="flex items-center uppercase"
      >
        <Marquee
          speed={40}
          direction="right"
          autoFill={true}
          className="h-full text-7xl"
        >
          {replacePlaceholders("文章")}&nbsp;&nbsp;/&nbsp;&nbsp;
        </Marquee>
      </GridItem>

      {/* 文章列表 */}
      {displayPosts.map((post, index) => {
        const areaMap = [
          [7, 8, 9],
          [10, 11, 12],
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9],
        ];
        const currentAreas = areaMap[index] as GridArea[];

        return (
          <GridItem
            key={index}
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

      {/* 查看全部文章 */}
      <GridItem
        areas={[10, 11, 12]}
        width={4}
        height={0.4}
        className="uppercase "
      >
        <Link
          href="/posts"
          className="flex items-center justify-between group px-10 py-15 h-full"
        >
          <div className="block" data-line-reveal>
            <div className="text-4xl relative inline box-decoration-clone bg-[linear-gradient(white,white)] bg-left-bottom bg-no-repeat bg-[length:0%_2px] transition-[background-size] duration-300 ease-out group-hover:bg-[length:100%_2px]">
              查看全部文章
            </div>
            <div className="text-2xl">共 {totalPosts} 篇文章</div>
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

      <ViewCountBatchLoader />
    </RowGrid>
  );
}
