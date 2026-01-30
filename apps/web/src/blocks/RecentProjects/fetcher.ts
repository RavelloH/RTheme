import type { BlockConfig } from "@/blocks/types";

export async function projectsFetcher(_config: BlockConfig) {
  // 目前是静态内容，未来可以从数据库 fetch
  return {};
}
