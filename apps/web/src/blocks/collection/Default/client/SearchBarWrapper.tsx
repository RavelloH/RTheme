"use client";

import dynamic from "next/dynamic";

// 动态导入 SearchInput（客户端组件）
const SearchInput = dynamic(
  () =>
    import("@/components/client/features/posts/SearchInput").then(
      (mod) => mod.default,
    ),
  {
    ssr: false,
  },
);

interface SearchBarWrapperProps {
  show: boolean;
}

/**
 * SearchBarWrapper - 搜索栏包裹组件（客户端组件）
 * 用于在服务端组件中动态加载搜索栏
 */
export default function SearchBarWrapper({ show }: SearchBarWrapperProps) {
  if (!show) return null;

  return <SearchInput />;
}
