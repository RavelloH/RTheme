import "server-only";

import { randomUUID } from "node:crypto";

import { connection } from "next/server";

import SearchModal from "@/app/@modal/(.)search/SearchModal";

export default async function SearchInterceptPage() {
  await connection();

  return <SearchModal key={randomUUID()} />;
}
