import type { BlockConfig } from "@/blocks/types";
import { fetchBlockInterpolatedData } from "../lib/server";

export async function projectsFetcher(config: BlockConfig) {
  // 启动插值数据获取
  const interpolatedData = await fetchBlockInterpolatedData(config.content);

  // 目前是静态内容，未来可以从数据库 fetch
  return {
    ...interpolatedData,
  };
}
