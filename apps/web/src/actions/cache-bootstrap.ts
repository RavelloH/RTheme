"use server";

import { revalidatePath, updateTag } from "next/cache";

import {
  collectBootstrapTags,
  getCriticalRevalidatePathTargets,
} from "@/lib/server/cache-bootstrap-targets";

export type BootstrapCacheRefreshResult = {
  refreshedTagCount: number;
  revalidatedPathCount: number;
};

export async function refreshBootstrapCaches(): Promise<BootstrapCacheRefreshResult> {
  const tags = await collectBootstrapTags();
  for (const tag of tags) {
    updateTag(tag);
  }

  const pathTargets = getCriticalRevalidatePathTargets();
  for (const target of pathTargets) {
    revalidatePath(target.path, target.type);
  }

  return {
    refreshedTagCount: tags.length,
    revalidatedPathCount: pathTargets.length,
  };
}
