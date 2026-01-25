"use client";

import React from "react";
import PaginationNav from "@/components/PaginationNav";
import { AutoTransition } from "@/ui/AutoTransition";

interface PostsPaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  show: boolean; // 是否显示分页器
}

export default function PostsPagination({
  currentPage,
  totalPages,
  basePath,
  show,
}: PostsPaginationProps) {
  return (
    <AutoTransition type="fade">
      {show ? (
        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          basePath={basePath}
        />
      ) : null}
    </AutoTransition>
  );
}
