"use client";

import React from "react";

import SearchContent from "@/blocks/collection/PagedPosts/client/SearchContent";
import type {
  PagedPostsBlockConfig,
  PagedPostsData,
} from "@/blocks/collection/PagedPosts/types";
import type { BlockComponentProps } from "@/blocks/core/definition";
import { getBlockRuntimeData } from "@/blocks/core/runtime/envelope";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import EmptyPostCard from "@/components/server/features/posts/EmptyPostCard";
import PostCard from "@/components/server/features/posts/PostCard";
import { createArray } from "@/lib/client/create-array";

/**
 * PagedPostsBlock - 分页文章列表组件
 * 用于展示标签或分类下的文章列表（不含分页器）
 * 固定每行 4 个文章，自动补位 EmptyPostCard
 * 支持搜索功能包裹
 */
export default function PagedPostsBlock({ block }: BlockComponentProps) {
  const data = getBlockRuntimeData<PagedPostsData>(block.runtime);
  const { posts = [], currentPage = 1, totalPages = 1, basePath = "" } = data;
  const content = (block.content as PagedPostsBlockConfig["content"]) || {};
  const searchable = (content.searchable as boolean) || false;

  // 文章网格组件
  const PostsGrid = React.useMemo(() => {
    return (
      <>
        {posts.length > 0 && (
          <RowGrid>
            {Array(Math.ceil(posts.length / 4))
              .fill(0)
              .map((_, rowIndex) => (
                <React.Fragment key={rowIndex}>
                  {Array.from({ length: 4 }, (_, index) => {
                    const postIndex = rowIndex * 4 + index;
                    const post = posts[postIndex];

                    return (
                      <GridItem
                        key={post ? post.slug : `empty-${postIndex}`}
                        areas={createArray(index * 3 + 1, (index + 1) * 3)}
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
                            cover={post.coverData}
                            summary={post.excerpt || ""}
                          />
                        ) : (
                          <EmptyPostCard
                            direction={index % 2 === 0 ? "left" : "right"}
                          />
                        )}
                      </GridItem>
                    );
                  })}
                </React.Fragment>
              ))}
          </RowGrid>
        )}
      </>
    );
  }, [posts]);

  // 如果启用搜索，用 SearchContent 包裹
  if (searchable) {
    return (
      <SearchContent
        initialPosts={posts}
        searchQuery=""
        currentPage={currentPage}
        totalPages={totalPages}
        basePath={basePath}
      />
    );
  }

  // 否则直接显示文章网格
  return PostsGrid;
}
