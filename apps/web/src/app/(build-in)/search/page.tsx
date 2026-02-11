import SearchClient from "@/app/(build-in)/search/SearchClient";
import { generateMetadata } from "@/lib/server/seo";

export const metadata = await generateMetadata(
  {
    title: "搜索",
    description: "搜索文章、项目、标签、分类与照片",
  },
  {
    pathname: "/search",
  },
);

export default function SearchPage() {
  return <SearchClient />;
}
