import "server-only";

import { randomUUID } from "crypto";

import SearchModal from "@/app/@modal/(.)search/SearchModal";

export default function SearchInterceptPage() {
  return <SearchModal key={randomUUID()} />;
}
