"use client";

import React, { useState } from "react";

import SearchContent, {
  type PostData,
} from "@/components/client/features/posts/SearchContent";
import RowGrid, { GridItem } from "@/components/client/layout/RowGrid";
import PaginationNav from "@/components/ui/PaginationNav";
import { createArray } from "@/lib/client/create-array";
import { AutoTransition } from "@/ui/AutoTransition";

interface PostsPageContentProps {
  initialPosts: PostData[];
  currentPage: number;
  totalPages: number;
  basePath: string;
  block2?: React.ReactNode;
}

export default function PostsPageContent({
  initialPosts,
  currentPage,
  totalPages,
  basePath,
  block2,
}: PostsPageContentProps) {
  const [isSearching, setIsSearching] = useState(false);

  return (
    <>
      <SearchContent
        initialPosts={initialPosts}
        searchQuery=""
        onSearchStateChange={setIsSearching}
      />
      <AutoTransition type="fade">
        {!isSearching && (
          <RowGrid key="pagination" className="mt-auto">
            <GridItem
              areas={createArray(1, 12)}
              width={1}
              height={0.2}
              className="flex justify-center items-center"
            >
              <PaginationNav
                currentPage={currentPage}
                totalPages={totalPages}
                basePath={basePath}
              />
            </GridItem>
          </RowGrid>
        )}
      </AutoTransition>
      {block2}
    </>
  );
}
